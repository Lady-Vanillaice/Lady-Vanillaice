export { saveCanvasAsPng } from "./core";
export { exportCalendarImage } from "./calendar-image-export";
import "./admin-export-field-visibility";
import "./admin-calendar-final-fixes";
import { installAdminDuoSingleOnlyEditor } from "./admin-duo-single-only-editor";
import { installAdminManualBookingEmailField } from "./admin-manual-booking-email-field";

installAdminDuoSingleOnlyEditor();
installAdminManualBookingEmailField();
