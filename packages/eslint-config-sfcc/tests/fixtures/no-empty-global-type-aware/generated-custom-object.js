export {}

const CustomObjectMgr = require("dw/object/CustomObjectMgr")

const notification = CustomObjectMgr.getCustomObject("ExampleNotification", "sample")
if (notification) {
  empty(notification.custom.eventCode)
}
