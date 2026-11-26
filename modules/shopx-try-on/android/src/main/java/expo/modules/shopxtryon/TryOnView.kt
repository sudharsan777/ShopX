package expo.modules.shopxtryon

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.os.SystemClock
import android.util.Log
import android.util.Size
import android.view.View
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.Executors

internal class TryOnView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var active = false
  var front = true
  var productId = 0
  private val onTrackingStatus by EventDispatcher()

  private val previewView = PreviewView(context).apply {
    scaleType = PreviewView.ScaleType.FILL_CENTER
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
  }
  private val overlay = JewelryOverlay(context)
  private val worker = Executors.newSingleThreadExecutor()
  private val bitmaps = mutableMapOf<String, Bitmap>()
  private val bracelet by lazy { BraceletMesh.load(context.applicationContext) }
  private var provider: ProcessCameraProvider? = null
  private var analysis: ImageAnalysis? = null
  private var preview: Preview? = null
  private var status = ""
  @Volatile private var generation = 0
  private var disposed = false
  private var layoutQueued = false

  private data class Configuration(val front: Boolean, val id: Int, val width: Int, val height: Int)
  private var configuration: Configuration? = null

  init {
    val container = FrameLayout(context)
    container.addView(previewView, FrameLayout.LayoutParams(-1, -1))
    container.addView(overlay, FrameLayout.LayoutParams(-1, -1))
    addView(container, LayoutParams(-1, -1))
    previewView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> applyConfiguration() }
  }

  override fun requestLayout() {
    super.requestLayout()
    // PreviewView attaches its TextureView after binding. React Native lays
    // out the exported view, so measure native children added afterward.
    if (width == 0 || height == 0 || layoutQueued) return
    layoutQueued = true
    post {
      try {
        if (isAttachedToWindow) {
          measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
          )
          layout(left, top, right, bottom)
        }
      } finally {
        layoutQueued = false
      }
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    post { applyConfiguration() }
  }

  override fun onDetachedFromWindow() {
    stopCamera()
    super.onDetachedFromWindow()
  }

  fun dispose() {
    if (disposed) return
    disposed = true
    stopCamera()
    worker.shutdown()
  }

  private fun publish(next: String) {
    if (status == next) return
    status = next
    onTrackingStatus(mapOf("status" to next))
  }

  fun applyConfiguration() {
    if (disposed) return
    if (!active || !isAttachedToWindow || productId !in fits) {
      if (configuration != null) stopCamera()
      return
    }
    if (previewView.width == 0 || previewView.height == 0) return
    val desired = Configuration(front, productId, previewView.width, previewView.height)
    if (configuration == desired) return
    stopCamera()
    configuration = desired
    val current = generation
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      publish("permission")
      return
    }
    publish("starting")
    val camera = ProcessCameraProvider.getInstance(context)
    camera.addListener({
      if (current != generation) return@addListener
      try {
        bindCamera(camera.get(), desired, current)
      } catch (failure: Exception) {
        Log.w("ShopXTryOn", "Camera binding failed", failure)
        unbindCamera()
        publish("cameraError")
      }
    }, ContextCompat.getMainExecutor(context))
  }

  private fun bindCamera(camera: ProcessCameraProvider, config: Configuration, current: Int) {
    val owner = appContext.currentActivity as? LifecycleOwner ?: error("Missing camera lifecycle")
    val viewport = previewView.viewPort ?: error("Missing preview viewport")
    val rotation = previewView.display.rotation
    val selector = if (config.front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
    if (!camera.hasCamera(selector)) {
      publish("noCamera")
      return
    }
    val fit = fits.getValue(config.id)
    val bitmaps = fit.images.map { path ->
      bitmaps.getOrPut(path) {
        context.assets.open("tryon/$path").use { BitmapFactory.decodeStream(it) }
          ?: error("Invalid overlay")
      }
    }
    overlay.configure(bitmaps, fit.mode, if (fit.mode == Mode.BRACELET) bracelet else null)
    val cameraPreview = Preview.Builder().setTargetRotation(rotation).build()
    cameraPreview.surfaceProvider = previewView.surfaceProvider
    val cameraAnalysis = ImageAnalysis.Builder()
      .setTargetRotation(rotation)
      .setResolutionSelector(
        ResolutionSelector.Builder()
          .setResolutionStrategy(ResolutionStrategy(Size(640, 480), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER))
          .build()
      )
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
    val tracker = Tracker(context.applicationContext, fit, config.width, config.height, config.front, bitmaps)
    provider = camera
    preview = cameraPreview
    analysis = cameraAnalysis
    val cases = UseCaseGroup.Builder().setViewPort(viewport)
      .addUseCase(cameraPreview).addUseCase(cameraAnalysis).build()
    camera.bindToLifecycle(owner, selector, cases)
    currentTracker = tracker
    val startedAt = SystemClock.uptimeMillis()
    cameraAnalysis.setAnalyzer(worker) { frame ->
      try {
        if (current == generation) {
          val sample = tracker.analyze(frame)
          if (sample != null) {
            // Rendering and smoothing are native. JS only receives status transitions.
            post {
              if (current == generation && SystemClock.uptimeMillis() - sample.time <= TRACKING_TIMEOUT) {
                overlay.show(sample)
                publish(if (sample.tracked) "tracking" else "searching")
              }
            }
          }
        }
      } catch (failure: Throwable) {
        if (failure !is Exception && failure !is LinkageError) throw failure
        Log.w("ShopXTryOn", "Landmark analysis failed", failure)
        post {
          if (current == generation) {
            stopCamera()
            publish("modelError")
          }
        }
      } finally {
        frame.close()
      }
    }
    overlay.onTimeout = { publish("searching") }
    postDelayed({
      if (current == generation && status == "starting" && SystemClock.uptimeMillis() - startedAt >= 5000) {
        stopCamera()
        publish("cameraError")
      }
    }, 5000)
  }

  private var currentTracker: Tracker? = null

  private fun unbindCamera() {
    analysis?.clearAnalyzer()
    val bound = listOfNotNull(preview, analysis)
    if (bound.isNotEmpty()) provider?.unbind(*bound.toTypedArray())
    preview = null
    analysis = null
    provider = null
    currentTracker?.let { tracker -> worker.execute { tracker.close() } }
    currentTracker = null
  }

  private fun stopCamera() {
    generation++
    configuration = null
    status = ""
    overlay.onTimeout = null
    overlay.clear()
    unbindCamera()
  }
}

private const val TRACKING_TIMEOUT = 340L
private data class Sample(
  val time: Long, val placements: List<Placement?>, val identity: String = "", val wrist: WristPose? = null
) {
  val tracked get() = wrist != null || placements.any { it != null }
}

private class Tracker(
  private val context: Context,
  private val fit: Fit,
  private val width: Int,
  private val height: Int,
  private val front: Boolean,
  bitmaps: List<Bitmap>
) {
  private val aspects = bitmaps.map { it.width.toFloat() / it.height }
  private var lastFrame = -1000L
  private var face: FaceLandmarker? = null
  private var pose: PoseLandmarker? = null
  private var hand: HandLandmarker? = null

  private fun base(name: String) = BaseOptions.builder().setModelAssetPath("tryon/$name.task").build()
  private fun faceModel() = face ?: FaceLandmarker.createFromOptions(context,
    FaceLandmarker.FaceLandmarkerOptions.builder()
      .setBaseOptions(base("face_landmarker")).setRunningMode(RunningMode.VIDEO)
      .setMinFaceDetectionConfidence(.65f).setMinFacePresenceConfidence(.65f)
      .setMinTrackingConfidence(.65f).setNumFaces(1).build()
  ).also { face = it }
  private fun poseModel() = pose ?: PoseLandmarker.createFromOptions(context,
    PoseLandmarker.PoseLandmarkerOptions.builder()
      .setBaseOptions(base("pose_landmarker_lite")).setRunningMode(RunningMode.VIDEO)
      .setMinPoseDetectionConfidence(.65f).setMinPosePresenceConfidence(.65f)
      .setMinTrackingConfidence(.65f).setNumPoses(1).build()
  ).also { pose = it }
  private fun handModel() = hand ?: HandLandmarker.createFromOptions(context,
    HandLandmarker.HandLandmarkerOptions.builder()
      .setBaseOptions(base("hand_landmarker")).setRunningMode(RunningMode.VIDEO)
      .setMinHandDetectionConfidence(.65f).setMinHandPresenceConfidence(.65f)
      .setMinTrackingConfidence(.65f).setNumHands(1).build()
  ).also { hand = it }

  fun analyze(frame: ImageProxy): Sample? {
    val now = SystemClock.uptimeMillis()
    val frameInterval = if (fit.mode == Mode.BRACELET) 65L else 92L
    if (now - lastFrame < frameInterval) return null
    lastFrame = now

    val buffer = frame.toBitmap()
    val crop = frame.cropRect
    val matrix = Matrix().apply { postRotate(frame.imageInfo.rotationDegrees.toFloat()) }
    var upright: Bitmap? = null
    var image: MPImage? = null
    try {
      val bitmap = Bitmap.createBitmap(buffer, crop.left, crop.top, crop.width(), crop.height(), matrix, true)
      upright = bitmap
      image = BitmapImageBuilder(bitmap).build()
      val transform = PreviewTransform(bitmap.width, bitmap.height, width, height, front)
      return when (fit.mode) {
        Mode.EARRINGS -> {
          val points = faceModel().detectForVideo(image, now).faceLandmarks().firstOrNull()
          Sample(now, if (points == null) emptyList() else placeEarrings(fit, points, transform, aspects))
        }
        Mode.NECKLACE -> {
          val points = poseModel().detectForVideo(image, now).landmarks().firstOrNull()
          Sample(now, if (points == null) emptyList() else placeNecklace(fit, points, transform))
        }
        Mode.RING, Mode.BRACELET -> {
          val result = handModel().detectForVideo(image, now)
          val points = result.landmarks().firstOrNull()
          val world = result.worldLandmarks().firstOrNull()
          val side = result.handedness().firstOrNull()?.firstOrNull()
          if (points == null || world == null || side == null || side.score() < .65f) Sample(now, emptyList())
          else if (fit.mode == Mode.BRACELET) {
            Sample(now, emptyList(), side.categoryName(), placeBracelet(points, world, transform, front))
          } else Sample(now, placeRing(fit, points, world, transform), side.categoryName())
        }
      }
    } finally {
      image?.close()
      if (upright !== buffer) upright?.recycle()
      buffer.recycle()
    }
  }

  fun close() {
    face?.close()
    pose?.close()
    hand?.close()
  }
}

private class JewelryOverlay(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val mask = Path()
  private var images = emptyList<Bitmap>()
  private var mode = Mode.EARRINGS
  private var bracelet: BraceletMesh? = null
  private var wrist: WristPose? = null
  private var wristStart: WristPose? = null
  private var wristAnimationStart = 0L
  private var placements = emptyList<Placement?>()
  private var identity = ""
  private var updated = 0L
  var onTimeout: (() -> Unit)? = null

  init {
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  private val expire = Runnable {
    clear()
    onTimeout?.invoke()
  }

  fun configure(images: List<Bitmap>, mode: Mode, bracelet: BraceletMesh?) {
    this.images = images
    this.mode = mode
    this.bracelet = bracelet
    clear()
  }

  fun show(sample: Sample) {
    if (sample.identity != identity || sample.time - updated > TRACKING_TIMEOUT) clear()
    identity = sample.identity
    val now = SystemClock.uptimeMillis()
    wristStart = interpolatedWrist(now)
    wrist = sample.wrist?.blend(wrist)
    wristAnimationStart = now
    val previous = placements
    placements = sample.placements.mapIndexed { index, placement ->
      placement?.blend(previous.getOrNull(index))
    }
    updated = sample.time
    removeCallbacks(expire)
    if (sample.tracked) {
      postDelayed(expire, (TRACKING_TIMEOUT - (SystemClock.uptimeMillis() - sample.time)).coerceAtLeast(1L))
    }
    invalidate()
  }

  fun clear() {
    wrist = null
    wristStart = null
    placements = emptyList()
    identity = ""
    updated = 0
    removeCallbacks(expire)
    invalidate()
  }

  private fun interpolatedWrist(now: Long): WristPose? =
    wrist?.blend(wristStart, ((now - wristAnimationStart) / 48f).coerceIn(0f, 1f))

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (SystemClock.uptimeMillis() - updated > TRACKING_TIMEOUT) return
    val now = SystemClock.uptimeMillis()
    interpolatedWrist(now)?.let {
      bracelet?.draw(canvas, it)
      if (wristStart != null && now - wristAnimationStart < 48L) postInvalidateOnAnimation()
    }
    placements.forEachIndexed { index, placement ->
      val image = images.getOrNull(index)
      if (placement == null || image == null) return@forEachIndexed
      val (point, width, height, angle, fingerWidth) = placement
      val saved = canvas.save()
      canvas.translate(point.x, point.y)
      canvas.rotate(angle)
      if (mode == Mode.RING) {
        // Clip the back half of this calibrated ring within the projected
        // finger silhouette. The stone and the outside edges remain in front.
        mask.reset()
        mask.fillType = Path.FillType.EVEN_ODD
        mask.addRect(-width, -height, width, height, Path.Direction.CW)
        mask.addRect(-fingerWidth * .41f, height * .01f, fingerWidth * .41f, height, Path.Direction.CW)
        canvas.clipPath(mask)
      }
      canvas.drawBitmap(image, null, RectF(-width / 2, -height / 2, width / 2, height / 2), paint)
      canvas.restoreToCount(saved)
    }
  }
}
