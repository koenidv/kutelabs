export class MixedEditorController {
  private static _instance: MixedEditorController
  public static get instance(): MixedEditorController {
    if (!MixedEditorController._instance) {
      MixedEditorController._instance = new MixedEditorController()
    }
    return MixedEditorController._instance
  }

  

}
