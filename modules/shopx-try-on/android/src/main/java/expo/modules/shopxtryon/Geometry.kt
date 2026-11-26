package expo.modules.shopxtryon

import com.google.mediapipe.tasks.components.containers.Landmark
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import kotlin.math.*

internal data class Point(val x: Float, val y: Float) {
  operator fun plus(p: Point) = Point(x + p.x, y + p.y)
  operator fun minus(p: Point) = Point(x - p.x, y - p.y)
  operator fun times(amount: Float) = Point(x * amount, y * amount)
  fun dot(p: Point) = x * p.x + y * p.y
  fun length() = hypot(x, y)
  fun unit() = this * (1f / length().coerceAtLeast(1f))
  fun angle() = Math.toDegrees(atan2(y, x).toDouble()).toFloat()
}

internal data class Placement(
  val center: Point,
  val width: Float,
  val height: Float,
  val angle: Float,
  val fingerWidth: Float = 0f
) {
  fun blend(previous: Placement?): Placement {
    if (previous == null || (center - previous.center).length() > width * 2) return this
    val weight = 0.64f
    val turn = ((angle - previous.angle + 540f) % 360f) - 180f
    return Placement(
      previous.center + (center - previous.center) * weight,
      previous.width + (width - previous.width) * weight,
      previous.height + (height - previous.height) * weight,
      previous.angle + turn * weight,
      previous.fingerWidth + (fingerWidth - previous.fingerWidth) * weight
    )
  }
}

internal enum class Mode { EARRINGS, NECKLACE, RING, BRACELET }

internal data class Fit(
  val mode: Mode,
  val images: List<String>,
  val width: Float,
  val drop: Float = 0f,
  val height: Float = 0f
)

internal val fits = mapOf(
  78 to Fit(Mode.EARRINGS, listOf("earring-left.png", "earring-right.png"), width = .23f, drop = .03f),
  70 to Fit(Mode.NECKLACE, listOf("necklace.png"), width = .73f, drop = .075f, height = .51f),
  90 to Fit(Mode.RING, listOf("ring.png"), width = 1.66f, drop = .26f, height = 1.16f),
  -1 to Fit(Mode.BRACELET, emptyList(), width = 0f)
)

// Every model sees the same upright viewport crop. PreviewView fills this viewport and
// CameraX mirrors only its front-facing preview. Perform that mirror here exactly once.
internal class PreviewTransform(
  frameWidth: Int, frameHeight: Int,
  private val width: Int, private val height: Int, mirror: Boolean
) {
  private val scale = max(width.toFloat() / frameWidth, height.toFloat() / frameHeight)
  private val scaledWidth = frameWidth * scale
  private val scaledHeight = frameHeight * scale
  private val mirrorX = mirror

  fun point(p: NormalizedLandmark): Point = Point(
    (if (mirrorX) 1f - p.x() else p.x()) * scaledWidth + (width - scaledWidth) / 2,
    p.y() * scaledHeight + (height - scaledHeight) / 2
  )

  fun visible(p: Point) = p.x in 0f..width.toFloat() && p.y in 0f..height.toFloat()
}

private fun perpendicularDown(axis: Point) = Point(-axis.y, axis.x)
private fun NormalizedLandmark.reliable() =
  visibility().orElse(1f) >= .62f && presence().orElse(1f) >= .62f

internal fun placeEarrings(
  fit: Fit, points: List<NormalizedLandmark>, transform: PreviewTransform,
  aspects: List<Float>
): List<Placement?> {
  val leftCheek = transform.point(points[234])
  val rightCheek = transform.point(points[454])
  val nose = transform.point(points[1])
  val eyeCorners = listOf(points[33], points[263]).map(transform::point).sortedBy { it.x }
  val axis = (eyeCorners[1] - eyeCorners[0]).unit()
  val down = perpendicularDown(axis)
  val faceWidth = (rightCheek - leftCheek).length()
  if (faceWidth < 35f || !transform.visible(nose)) return emptyList()
  val projectedWidth = abs((rightCheek - leftCheek).dot(axis)).coerceAtLeast(1f)
  val yaw = (nose - (leftCheek + rightCheek) * .5f).dot(axis) / projectedWidth

  // The face mesh has no lobe vertices. Estimate each independently from the
  // temple-side cheek and adjacent jaw point, then reject the far side in profile.
  val sides = listOf(234 to 132, 454 to 361)
  return sides.mapIndexed { index, (edge, jaw) ->
    val cheek = transform.point(points[edge])
    val anatomicallyFar = (yaw > .16f && cheek.x > nose.x) || (yaw < -.16f && cheek.x < nose.x)
    if (!points[edge].reliable() || anatomicallyFar || !transform.visible(cheek)) return@mapIndexed null
    val outward = if ((cheek - nose).dot(axis) < 0) -1f else 1f
    val lobe = cheek * .63f + transform.point(points[jaw]) * .37f +
      axis * (faceWidth * .045f * outward) + down * (faceWidth * fit.drop)
    val width = faceWidth * fit.width
    val height = width / aspects[index]
    Placement(lobe + down * (height * .47f), width, height, axis.angle())
  }
}

internal fun placeNecklace(
  fit: Fit, points: List<NormalizedLandmark>, transform: PreviewTransform
): List<Placement?> {
  if (listOf(0, 11, 12).any { !points[it].reliable() }) return emptyList()
  val shoulders = listOf(points[11], points[12]).map(transform::point).sortedBy { it.x }
  val nose = transform.point(points[0])
  val middle = (shoulders[0] + shoulders[1]) * .5f
  val across = shoulders[1] - shoulders[0]
  val span = across.length()
  val axis = across.unit()
  val down = perpendicularDown(axis)
  val rise = (middle - nose).dot(down)
  if (span < 55 || rise !in (span * .16f)..(span * 1.3f) ||
    shoulders.any { !transform.visible(it) } || !transform.visible(nose)) return emptyList()
  val neckShift = (nose - middle).dot(axis).coerceIn(-span * .20f, span * .20f) * .27f
  val anchor = middle + axis * neckShift + down * (span * fit.drop)
  val depth = abs(points[11].z() - points[12].z())
  if (depth > .55f) return emptyList()
  val height = span * fit.height * (1f - depth * .5f).coerceIn(.72f, 1f)
  return listOf(Placement(anchor + down * (height * .27f), span * fit.width, height, axis.angle()))
}

internal fun placeRing(
  fit: Fit,
  points: List<NormalizedLandmark>,
  world: List<Landmark>,
  transform: PreviewTransform
): List<Placement?> {
  // The palm normal becomes horizontal as the hand turns edge-on. In that
  // view the finger spans become unreliable and the rear-band mask is invalid.
  val wrist = world[0]
  val indexKnuckle = world[5]
  val pinky = world[17]
  val ax = indexKnuckle.x() - wrist.x()
  val ay = indexKnuckle.y() - wrist.y()
  val az = indexKnuckle.z() - wrist.z()
  val bx = pinky.x() - wrist.x()
  val by = pinky.y() - wrist.y()
  val bz = pinky.z() - wrist.z()
  val normalX = ay * bz - az * by
  val normalY = az * bx - ax * bz
  val normalZ = ax * by - ay * bx
  val normalLength = sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ)
  if (normalLength < .00001f || abs(normalZ) / normalLength < .32f) return emptyList()

  val hand = points.map(transform::point)
  val base = hand[13]
  val joint = hand[14]
  val finger = joint - base
  val axis = finger.unit()
  val palmWidth = (hand[5] - hand[17]).length()
  val proximal = finger.length()
  if (palmWidth < 35f || proximal !in (palmWidth * .20f)..(palmWidth * .94f) ||
    (hand[15] - joint).unit().dot(axis) < .23f || !transform.visible(base) || !transform.visible(joint)
  ) return emptyList()
  val width = ((base - hand[17]).length() + (base - hand[9]).length()) * .28f
  val anchor = base + finger * fit.drop
  // A nearer neighboring finger crossing the fit invalidates the overlay.
  val ringDepth = (points[13].z() + points[14].z()) * .5f
  val occluded = listOf(7, 8, 11, 12, 19, 20).any { index ->
    (hand[index] - anchor).length() < width * .66f && points[index].z() < ringDepth - .017f
  }
  if (occluded || abs(points[13].z() - points[14].z()) > .14f) return emptyList()
  return listOf(Placement(anchor, width * fit.width, width * fit.height, axis.angle() + 90f, width))
}
