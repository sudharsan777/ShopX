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
  fun blend(previous: WristPose, positionWeight: Float, rotationWeight: Float = positionWeight,
    scaleWeight: Float = positionWeight
  ): WristPose {
    val axis = interpolateAxis(previous.along, along, rotationWeight)
    val cross = interpolateAxis(previous.across, across, rotationWeight)
    val orthogonal = (cross - axis * cross.dot(axis)).unit()
    return WristPose(
      previous.center + (center - previous.center) * positionWeight,
      if (orthogonal.dot(orthogonal) > .9f) orthogonal else previous.across,
      axis,
      previous.pixelsPerMeter + (pixelsPerMeter - previous.pixelsPerMeter) * scaleWeight,
      interpolateAxis(Vector3(previous.maskAxis.x, previous.maskAxis.y, 0f),
        Vector3(maskAxis.x, maskAxis.y, 0f), rotationWeight).screen(),
      previous.wristWidth + (wristWidth - previous.wristWidth) * scaleWeight
    )
  }

  // An oval can be represented with either cross-axis sign. Keep the closest
  // representation when an occluded palm is reconstructed on the other side.
  fun alignAcross(reference: WristPose) =
    if (across.dot(reference.across) < 0f) copy(across = across * -1f) else this
}

private fun interpolateAxis(from: Vector3, to: Vector3, weight: Float): Vector3 {
  val dot = from.dot(to).coerceIn(-1f, 1f)
  if (dot > .995f) return (from * (1f - weight) + to * weight).unit()
  val angle = acos(dot)
  val perpendicular = (to - from * dot).unit()
  val direction = if (perpendicular.dot(perpendicular) > .5f) perpendicular
    else from.cross(if (abs(from.z) > .9f) Vector3(1f, 0f, 0f) else Vector3(0f, 0f, 1f)).unit()
  return (from * cos(angle * weight) + direction * sin(angle * weight)).unit()
}

internal data class BraceletFit(
  val pose: WristPose? = null,
  val reason: String,
  val rejected: List<String> = emptyList(),
  val wristConfidence: Float? = null,
  val palmCount: Int = 0
)

private fun NormalizedLandmark.confidence(): Float? =
  listOfNotNull(visibility().orElse(null), presence().orElse(null)).minOrNull()

internal fun placeBracelet(
  points: List<NormalizedLandmark>, world: List<Landmark>?, transform: PreviewTransform,
  mirror: Boolean, reference: WristPose?
): BraceletFit {
  val rejected = ArrayList<String>(5)
  fun usable(index: Int): Boolean {
    val point = points.getOrNull(index)
    val reason = when {
      point == null -> "missing"
      !point.x().isFinite() || !point.y().isFinite() -> "non_finite"
      (point.confidence() ?: 1f) < .45f -> "low_confidence"
      point.x() !in -.14f..1.14f || point.y() !in -.14f..1.14f -> "out_of_crop"
      else -> return true
    }
    rejected.add("$index:$reason")
    return false
  }
  val confidence = points.firstOrNull()?.confidence()
  if (!usable(0)) return BraceletFit(reason = "wrist_unreliable", rejected = rejected, wristConfidence = confidence)
  val palmIndices = listOf(5, 9, 13, 17).filter(::usable)
  fun result(reason: String, pose: WristPose? = null) =
    BraceletFit(pose, reason, rejected, confidence, palmIndices.size)

  val wrist = transform.point(points[0])
  if (!transform.visible(wrist)) return result("wrist_outside_preview")
  if (palmIndices.isEmpty()) return result("palm_unreliable")

  val palm = palmIndices.map { transform.point(points[it]) }
    .reduce(Point::plus) * (1f / palmIndices.size)
  val wristToPalm = palm - wrist
  if (wristToPalm.length() < 8f) return result("palm_axis_too_short")
  val screenAxis = wristToPalm.unit()

  // A partial observation still moves the bracelet with the wrist. Reuse the
  // previous depth and scale until enough landmarks return for a full 3D fit.
  fun partial(reason: String): BraceletFit {
    val previous = reference ?: return result(reason)
    val rotation = atan2(previous.maskAxis.x * screenAxis.y - previous.maskAxis.y * screenAxis.x,
      previous.maskAxis.dot(screenAxis))
    fun rotate(v: Vector3) = Vector3(
      v.x * cos(rotation) - v.y * sin(rotation), v.x * sin(rotation) + v.y * cos(rotation), v.z
    )
    val center = wrist - screenAxis * (previous.pixelsPerMeter * .014f)
    if (!transform.visible(center)) return result("bracelet_outside_preview")
    return result("partial:$reason", previous.copy(
      center = center, across = rotate(previous.across), along = rotate(previous.along), maskAxis = screenAxis
    ))
  }

  fun vector(index: Int): Vector3? {
    val p = world?.getOrNull(index) ?: return null
    if (!p.x().isFinite() || !p.y().isFinite() || !p.z().isFinite()) return null
    return Vector3(if (mirror) -p.x() else p.x(), p.y(), p.z())
  }
  val origin = vector(0) ?: return partial("world_wrist_missing")
  val palmWorld = palmIndices.mapNotNull { index -> vector(index)?.let { index to it } }
  if (palmWorld.size < 2) return partial("world_palm_incomplete")
  val (firstIndex, first) = palmWorld.first()
  val (lastIndex, last) = palmWorld.last()
  val crossWorld = first - last
  val crossImage = transform.point(points[firstIndex]) - transform.point(points[lastIndex])
  val worldAlong = palmWorld.map { it.second }.reduce(Vector3::plus) * (1f / palmWorld.size) - origin
  val along = worldAlong.unit()
  val across = (crossWorld - along * crossWorld.dot(along)).unit()
  val depth = across.cross(along)
  if (depth.dot(depth) < .75f || along.screen().length() < .14f) return partial("unstable_world_axes")

  val crossLength = crossWorld.screen().length()
  val alongLength = worldAlong.screen().length()
  val denominator = crossLength * crossLength + alongLength * alongLength
  if (denominator < .00025f) return partial("degenerate_projection")
  val scale = (crossImage.length() * crossLength + wristToPalm.length() * alongLength) / denominator
  if (!scale.isFinite() || scale !in 110f..25000f) return partial("scale_out_of_range")

  val center = wrist - screenAxis * (scale * .014f)
  if (!transform.visible(center)) return result("bracelet_outside_preview")
  val fullPalmWidth = if (firstIndex == 5 && lastIndex == 17) sqrt(crossWorld.dot(crossWorld)) * .76f else null
  val estimatedWidth = fullPalmWidth?.let { scale * it }
    ?: reference?.let { it.wristWidth * scale / it.pixelsPerMeter }
    ?: scale * .047f
  val silhouette = sqrt(across.screen().length().pow(2) + (.72f * depth.screen().length()).pow(2))
    .coerceIn(.72f, 1f)
  return result("full", WristPose(center, across, along, scale, screenAxis,
    if (fullPalmWidth == null && reference != null) estimatedWidth else estimatedWidth * silhouette))
}

internal enum class WristState { SEARCHING, TRACKING, COASTING, LOST }

internal data class WristFrame(
  val captured: Long, val completed: Long, val fit: BraceletFit, val side: String?, val sideConfidence: Float?
)

internal class WristTracking {
  companion object {
    const val LOSS_MS = 650L
    private const val COAST_MS = 170L
    private const val FADE_MS = 130L
    private const val ACQUIRE_MS = 115L
  }

  var state = WristState.SEARCHING
    private set
  var reason = "waiting_for_frame"
    private set
  var modelAlpha = 0f
    private set
  var pose: WristPose? = null
    private set
  private var target: WristPose? = null
  private var candidate: Pair<Long, WristPose>? = null
  private var lastCapture = -1L
  private var lastGood = -1L
  private var lastTick = -1L
  private var fadeStarted = -1L
  private var alphaAtLoss = 0f

  fun observe(frame: WristFrame, now: Long) {
    if (frame.captured <= lastCapture) return
    lastCapture = frame.captured
    if (now - frame.completed > COAST_MS || now - frame.captured > LOSS_MS) {
      missed("stale_result")
      return
    }
    val fit = frame.fit.pose
    if (fit == null) {
      missed(frame.fit.reason)
      return
    }
    val previous = target
    if (previous != null && state == WristState.TRACKING &&
      (fit.center - previous.center).length() > max(fit.wristWidth, previous.wristWidth) * 1.8f) {
      missed("position_outlier")
    }
    val acquiring = state == WristState.SEARCHING || state == WristState.LOST ||
      (state == WristState.COASTING && previous != null &&
        (fit.center - previous.center).length() > max(fit.wristWidth, previous.wristWidth) * 1.5f)
    if (acquiring) {
      val first = candidate
      if (first == null || frame.completed - first.first > LOSS_MS ||
        (fit.center - first.second.center).length() > max(fit.wristWidth, first.second.wristWidth)) {
        candidate = frame.completed to fit
        reason = "confirming_wrist"
        return
      }
      if (state != WristState.COASTING) {
        pose = fit
        modelAlpha = 0f
        fadeStarted = -1L
      }
    }
    target = previous?.let(fit::alignAcross) ?: fit
    pose = pose ?: target
    candidate = null
    lastGood = frame.completed
    state = WristState.TRACKING
    reason = frame.fit.reason
  }

  private fun missed(message: String) {
    reason = message
    candidate = null
    if (state == WristState.TRACKING) state = WristState.COASTING
  }

  fun tick(now: Long): Boolean {
    val delta = if (lastTick < 0) 16f else (now - lastTick).coerceIn(0L, 64L).toFloat()
    lastTick = now
    if ((state == WristState.TRACKING || state == WristState.COASTING) && now - lastGood >= LOSS_MS) {
      state = WristState.LOST
      fadeStarted = now
      alphaAtLoss = modelAlpha
      reason = "sustained_loss:$reason"
    } else if (state == WristState.TRACKING && now - lastGood >= COAST_MS) {
      state = WristState.COASTING
      reason = "frame_gap"
    }
    val oldPose = pose
    val oldAlpha = modelAlpha
    if (state == WristState.TRACKING || state == WristState.COASTING) {
      val latest = target
      if (latest != null && oldPose != null && delta > 0f) {
        val movement = (latest.center - oldPose.center).length()
        if (movement > .5f || latest.along.dot(oldPose.along) < .9999f ||
          latest.across.dot(oldPose.across) < .9999f ||
          abs(latest.pixelsPerMeter - oldPose.pixelsPerMeter) > latest.pixelsPerMeter * .004f) {
          val positionTime = if (movement > latest.wristWidth * .35f) 24f else 48f
          pose = latest.blend(oldPose, 1f - exp(-delta / positionTime),
            1f - exp(-delta / 58f), 1f - exp(-delta / 85f))
        }
      }
      modelAlpha = (modelAlpha + delta / ACQUIRE_MS).coerceAtMost(1f)
    } else if (state == WristState.LOST && fadeStarted >= 0) {
      modelAlpha = alphaAtLoss * (1f - (now - fadeStarted).toFloat() / FADE_MS).coerceIn(0f, 1f)
      if (modelAlpha == 0f) {
        pose = null
        target = null
      }
    }
    return oldPose != pose || oldAlpha != modelAlpha
  }

  val visible get() = pose != null && modelAlpha > 0f
  val hasLock get() = state == WristState.TRACKING || state == WristState.COASTING
  val needsTick get() = hasLock || visible
}

internal class BraceletMesh private constructor(
  private val positions: Array<Vector3>,
  private val normals: Array<Vector3>,
  private val indices: IntArray,
  private val baseColors: Array<FloatArray>
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
  private val depthOrder = compareByDescending<Int> { depths[it] }
  private val light = Vector3(-.35f, -.48f, -.8f).unit()

  fun draw(canvas: Canvas, pose: WristPose, alpha: Float) {
    val layer = if (alpha < 1f) {
      val radius = pose.pixelsPerMeter * .048f
      canvas.saveLayerAlpha(pose.center.x - radius, pose.center.y - radius,
        pose.center.x + radius, pose.center.y + radius, (alpha * 255).roundToInt())
    } else -1
    val cross = pose.across
    val along = pose.along
    val depth = cross.cross(along).unit()
    val lightX = cross.dot(light)
    val lightY = along.dot(light)
    val lightZ = depth.dot(light)
    for (i in positions.indices) {
      val p = positions[i]
      val n = normals[i]
      x[i] = pose.center.x + (cross.x * p.x + along.x * p.y + depth.x * p.z) * pose.pixelsPerMeter
      y[i] = pose.center.y + (cross.y * p.x + along.y * p.y + depth.y * p.z) * pose.pixelsPerMeter
      z[i] = cross.z * p.x + along.z * p.y + depth.z * p.z
      val shine = (n.x * lightX + n.y * lightY + n.z * lightZ).coerceAtLeast(0f)
      val diffuse = .33f + .65f * shine
      val specular = shine.pow(12) * .55f
      fun channel(value: Float) = ((value * diffuse + specular) * 255).roundToInt().coerceIn(0, 255)
      val base = baseColors[i]
      colors[i] = Color.rgb(channel(base[0]), channel(base[1]), channel(base[2]))
    }
    for (i in order.indices) depths[i] =
      (z[indices[i * 3]] + z[indices[i * 3 + 1]] + z[indices[i * 3 + 2]]) / 3
    order.sortWith(depthOrder)
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
    if (layer >= 0) canvas.restoreToCount(layer)
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
    // Local meshes are packed as indexed, material-colored primitives.
    fun load(context: Context, filename: String): BraceletMesh {
      val bytes = context.assets.open("tryon/$filename").use { it.readBytes() }
      val data = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
      require(data.int == 0x46546c67 && data.int == 2 && data.int == bytes.size)
      val jsonLength = data.int
      require(data.int == 0x4e4f534a)
      val json = JSONObject(String(ByteArray(jsonLength).also { data.get(it) }, Charsets.UTF_8))
      val binaryLength = data.int
      require(data.int == 0x004e4942 && binaryLength == data.remaining())
      val binary = data.slice().order(ByteOrder.LITTLE_ENDIAN)
      val primitives = json.getJSONArray("meshes").getJSONObject(0).getJSONArray("primitives")
      val accessors = json.getJSONArray("accessors")
      val views = json.getJSONArray("bufferViews")
      fun view(accessor: JSONObject) = views.getJSONObject(accessor.getInt("bufferView"))
      fun offset(accessor: JSONObject) = view(accessor).optInt("byteOffset") + accessor.optInt("byteOffset")
      fun vectors(index: Int): Array<Vector3> {
        val accessor = accessors.getJSONObject(index)
        require(accessor.getInt("componentType") == 5126 && accessor.getString("type") == "VEC3")
        val start = offset(accessor)
        val stride = view(accessor).optInt("byteStride", 12)
        return Array(accessor.getInt("count")) { i ->
          val o = start + i * stride
          Vector3(binary.getFloat(o), binary.getFloat(o + 4), binary.getFloat(o + 8))
        }
      }
      val positions = ArrayList<Vector3>()
      val normals = ArrayList<Vector3>()
      val indices = ArrayList<Int>()
      val colors = ArrayList<FloatArray>()
      for (part in 0 until primitives.length()) {
        val primitive = primitives.getJSONObject(part)
        require(primitive.optInt("mode", 4) == 4)
        val attributes = primitive.getJSONObject("attributes")
        val vertices = vectors(attributes.getInt("POSITION"))
        val directions = vectors(attributes.getInt("NORMAL"))
        val indexes = accessors.getJSONObject(primitive.getInt("indices"))
        require(indexes.getInt("componentType") == 5123 && indexes.getString("type") == "SCALAR")
        require(vertices.size == directions.size && indexes.getInt("count") % 3 == 0)
        val start = offset(indexes)
        val base = positions.size
        repeat(indexes.getInt("count")) { i ->
          val index = binary.getShort(start + 2 * i).toInt() and 0xffff
          require(index in vertices.indices)
          indices.add(base + index)
        }
        val color = json.getJSONArray("materials").getJSONObject(primitive.getInt("material"))
          .getJSONObject("pbrMetallicRoughness").getJSONArray("baseColorFactor")
        val rgb = FloatArray(3) { color.getDouble(it).toFloat() }
        positions.addAll(vertices)
        normals.addAll(directions)
        repeat(vertices.size) { colors.add(rgb) }
      }
      return BraceletMesh(positions.toTypedArray(), normals.toTypedArray(), indices.toIntArray(), colors.toTypedArray())
    }
  }
}
