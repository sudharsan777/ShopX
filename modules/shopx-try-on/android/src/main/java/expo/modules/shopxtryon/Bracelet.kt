package expo.modules.shopxtryon

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.os.Build
import com.google.mediapipe.tasks.components.containers.Landmark
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*

internal data class Vector3(val x: Float, val y: Float, val z: Float) {
  operator fun plus(other: Vector3) = Vector3(x + other.x, y + other.y, z + other.z)
  operator fun minus(other: Vector3) = Vector3(x - other.x, y - other.y, z - other.z)
  operator fun times(scale: Float) = Vector3(x * scale, y * scale, z * scale)
  fun dot(other: Vector3) = x * other.x + y * other.y + z * other.z
  fun cross(other: Vector3) = Vector3(y * other.z - z * other.y, z * other.x - x * other.z, x * other.y - y * other.x)
  fun unit() = this * (1f / sqrt(dot(this)).coerceAtLeast(.000001f))
  fun screen() = Point(x, y)
}

internal data class WristPose(
  val center: Point, val across: Vector3, val along: Vector3, val pixelsPerMeter: Float,
  val maskAxis: Point, val wristWidth: Float
) {
  fun blend(previous: WristPose?, weight: Float = .66f): WristPose {
    if (previous == null || (center - previous.center).length() > wristWidth * 1.7f ||
      across.dot(previous.across) < .30f || along.dot(previous.along) < .30f) return this
    val axis = (previous.along * (1f - weight) + along * weight).unit()
    val cross = previous.across * (1f - weight) + across * weight
    return WristPose(
      previous.center + (center - previous.center) * weight,
      (cross - axis * cross.dot(axis)).unit(),
      axis,
      previous.pixelsPerMeter + (pixelsPerMeter - previous.pixelsPerMeter) * weight,
      (previous.maskAxis * (1f - weight) + maskAxis * weight).unit(),
      previous.wristWidth + (wristWidth - previous.wristWidth) * weight
    )
  }
}

internal fun placeBracelet(
  points: List<NormalizedLandmark>, world: List<Landmark>, transform: PreviewTransform, mirror: Boolean
): WristPose? {
  if (points.size < 18 || world.size < 18) return null
  val indexes = listOf(0, 5, 9, 13, 17)
  if (indexes.any { points[it].visibility().orElse(1f) < .6f || points[it].presence().orElse(1f) < .6f }) return null

  fun point(index: Int) = transform.point(points[index])
  fun vector(index: Int): Vector3 {
    val p = world[index]
    return Vector3(if (mirror) -p.x() else p.x(), p.y(), p.z())
  }

  val wrist = point(0)
  val palm = (point(5) + point(9) + point(13) + point(17)) * .25f
  val wristToPalm = palm - wrist
  val projectedAcross = point(5) - point(17)
  if (wristToPalm.length() < 25f || !transform.visible(wrist) || !transform.visible(palm)) return null

  val worldAcross = vector(5) - vector(17)
  val worldAlong = (vector(5) + vector(9) + vector(13) + vector(17)) * .25f - vector(0)
  val along = worldAlong.unit()
  val across = (worldAcross - along * worldAcross.dot(along)).unit()
  val depth = across.cross(along)
  if (depth.dot(depth) < .75f || along.screen().length() < .28f) return null

  // Use both projected axes so wrist roll does not make the bangle shrink.
  val acrossLength = worldAcross.screen().length()
  val alongLength = worldAlong.screen().length()
  val denominator = acrossLength * acrossLength + alongLength * alongLength
  if (denominator < .00035f) return null
  val scale = (projectedAcross.length() * acrossLength + wristToPalm.length() * alongLength) / denominator
  if (!scale.isFinite() || scale !in 200f..20000f) return null

  val axis = wristToPalm.unit()
  val center = wrist - axis * (scale * .014f)
  if (!transform.visible(center)) return null
  val estimatedWidth = scale * sqrt(worldAcross.dot(worldAcross)) * .76f
  val silhouette = sqrt(across.screen().length().pow(2) + (.72f * depth.screen().length()).pow(2))
    .coerceIn(.72f, 1f)
  return WristPose(center, across, along, scale, axis, estimatedWidth * silhouette)
}

internal class BraceletMesh private constructor(
  private val positions: Array<Vector3>,
  private val normals: Array<Vector3>,
  private val indices: IntArray,
  private val gold: FloatArray
) {
  private val x = FloatArray(positions.size)
  private val y = FloatArray(positions.size)
  private val z = FloatArray(positions.size)
  private val colors = IntArray(positions.size)
  private val order = Array(indices.size / 3) { it }
  private val depths = FloatArray(order.size)
  private val vertices = FloatArray(indices.size * 2)
  private val vertexColors = IntArray(indices.size)
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val mask = Path()
  private val triangle = Path()
  private val light = Vector3(-.35f, -.48f, -.8f).unit()

  fun draw(canvas: Canvas, pose: WristPose) {
    val cross = pose.across
    val along = pose.along
    val depth = cross.cross(along).unit()
    for (i in positions.indices) {
      val p = positions[i]
      val n = normals[i]
      val position = cross * p.x + along * p.y + depth * p.z
      val normal = cross * n.x + along * n.y + depth * n.z
      x[i] = pose.center.x + position.x * pose.pixelsPerMeter
      y[i] = pose.center.y + position.y * pose.pixelsPerMeter
      z[i] = position.z
      val diffuse = (.33f + .65f * normal.dot(light).coerceAtLeast(0f))
      val specular = (normal.dot(light).coerceAtLeast(0f)).pow(12) * .55f
      fun channel(value: Float) = ((value * diffuse + specular) * 255).roundToInt().coerceIn(0, 255)
      colors[i] = Color.rgb(channel(gold[0]), channel(gold[1]), channel(gold[2]))
    }
    for (i in order.indices) depths[i] =
      (z[indices[i * 3]] + z[indices[i * 3 + 1]] + z[indices[i * 3 + 2]]) / 3
    order.sortWith(compareByDescending { depths[it] })
    val nearStart = order.indexOfFirst { depths[it] <= 0f }.let { if (it < 0) order.size else it }

    // Positive camera depth is behind the wrist. Clip those triangles to
    // the outside of a wrist-shaped strip; foreground triangles stay intact.
    val acrossScreen = Point(-pose.maskAxis.y, pose.maskAxis.x) * (pose.wristWidth * .48f)
    val long = pose.maskAxis * (pose.wristWidth * 1.30f)
    val p0 = pose.center - long - acrossScreen
    val p1 = pose.center - long + acrossScreen
    val p2 = pose.center + long + acrossScreen
    val p3 = pose.center + long - acrossScreen
    mask.reset()
    mask.fillType = Path.FillType.EVEN_ODD
    mask.addRect(0f, 0f, canvas.width.toFloat(), canvas.height.toFloat(), Path.Direction.CW)
    mask.moveTo(p0.x, p0.y)
    mask.lineTo(p1.x, p1.y)
    mask.lineTo(p2.x, p2.y)
    mask.lineTo(p3.x, p3.y)
    mask.close()
    val saved = canvas.save()
    canvas.clipPath(mask)
    drawRange(canvas, 0, nearStart)
    canvas.restoreToCount(saved)
    drawRange(canvas, nearStart, order.size)
  }

  private fun drawRange(canvas: Canvas, start: Int, end: Int) {
    if (start == end) return
    if (Build.VERSION.SDK_INT >= 29) {
      var count = 0
      for (i in start until end) {
        val base = order[i] * 3
        for (offset in 0..2) {
          val vertex = indices[base + offset]
          vertices[count * 2] = x[vertex]
          vertices[count * 2 + 1] = y[vertex]
          vertexColors[count++] = colors[vertex]
        }
      }
      paint.color = Color.WHITE
      canvas.drawVertices(Canvas.VertexMode.TRIANGLES, count * 2, vertices, 0, null, 0, vertexColors, 0, null, 0, 0, paint)
    } else {
      for (i in start until end) {
        val offset = order[i] * 3
        val a = indices[offset]
        val b = indices[offset + 1]
        val c = indices[offset + 2]
        triangle.reset()
        triangle.moveTo(x[a], y[a])
        triangle.lineTo(x[b], y[b])
        triangle.lineTo(x[c], y[c])
        triangle.close()
        paint.color = colors[a]
        canvas.drawPath(triangle, paint)
      }
    }
  }

  companion object {
    // The bundled model is one indexed triangle primitive with position,
    // normal and base-color attributes. GLB chunks stay local.
    fun load(context: Context): BraceletMesh {
      val bytes = context.assets.open("tryon/gold-oval-bracelet.glb").use { it.readBytes() }
      val data = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
      require(data.int == 0x46546c67 && data.int == 2 && data.int == bytes.size)
      val jsonLength = data.int
      require(data.int == 0x4e4f534a)
      val json = JSONObject(String(ByteArray(jsonLength).also { data.get(it) }, Charsets.UTF_8))
      val binaryLength = data.int
      require(data.int == 0x004e4942 && binaryLength == data.remaining())
      val binary = data.slice().order(ByteOrder.LITTLE_ENDIAN)
      val primitive = json.getJSONArray("meshes").getJSONObject(0).getJSONArray("primitives").getJSONObject(0)
      require(primitive.optInt("mode", 4) == 4)
      val attributes = primitive.getJSONObject("attributes")
      val accessors = json.getJSONArray("accessors")
      val views = json.getJSONArray("bufferViews")
      fun view(accessor: JSONObject) = views.getJSONObject(accessor.getInt("bufferView"))
      fun offset(accessor: JSONObject) = view(accessor).optInt("byteOffset") + accessor.optInt("byteOffset")
      fun vectors(name: String): Array<Vector3> {
        val accessor = accessors.getJSONObject(attributes.getInt(name))
        require(accessor.getInt("componentType") == 5126 && accessor.getString("type") == "VEC3")
        val start = offset(accessor)
        val stride = view(accessor).optInt("byteStride", 12)
        return Array(accessor.getInt("count")) { i ->
          val o = start + i * stride
          Vector3(binary.getFloat(o), binary.getFloat(o + 4), binary.getFloat(o + 8))
        }
      }
      val positions = vectors("POSITION")
      val normals = vectors("NORMAL")
      val indexes = accessors.getJSONObject(primitive.getInt("indices"))
      require(indexes.getInt("componentType") == 5123 && indexes.getString("type") == "SCALAR")
      val start = offset(indexes)
      val indices = IntArray(indexes.getInt("count")) { binary.getShort(start + 2 * it).toInt() and 0xffff }
      require(normals.size == positions.size && indices.size % 3 == 0 && indices.all { it in positions.indices })
      val color = json.getJSONArray("materials").getJSONObject(primitive.getInt("material"))
        .getJSONObject("pbrMetallicRoughness").getJSONArray("baseColorFactor")
      return BraceletMesh(positions, normals, indices, FloatArray(3) { color.getDouble(it).toFloat() })
    }
  }
}
