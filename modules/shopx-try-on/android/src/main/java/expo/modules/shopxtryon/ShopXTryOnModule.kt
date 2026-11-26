package expo.modules.shopxtryon

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShopXTryOnModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShopXTryOn")

    Function("getCameras") {
      val manager = appContext.reactContext?.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
      val directions = runCatching {
        manager?.cameraIdList?.mapNotNull { id ->
          manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING)
        }.orEmpty()
      }.getOrDefault(emptyList())
      mapOf(
        "front" to (CameraCharacteristics.LENS_FACING_FRONT in directions),
        "rear" to (CameraCharacteristics.LENS_FACING_BACK in directions)
      )
    }

    View(TryOnView::class) {
      Events("onTrackingStatus")
      Prop("active") { view: TryOnView, active: Boolean -> view.active = active }
      Prop("front") { view: TryOnView, front: Boolean -> view.front = front }
      Prop("productId") { view: TryOnView, id: Int -> view.productId = id }
      OnViewDidUpdateProps { view: TryOnView -> view.applyConfiguration() }
      OnViewDestroys { view: TryOnView -> view.dispose() }
    }
  }
}
