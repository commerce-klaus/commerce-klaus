export {}

declare global {
  namespace SfccHooks {
    type ShopperProductModifyGetResponse = (document: { c_brand?: string }) => void
  }
}
