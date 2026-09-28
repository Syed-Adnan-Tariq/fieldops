"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckInEventType = exports.GeofenceType = exports.WorkerStatus = exports.JobStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["WORKER"] = "worker";
})(UserRole || (exports.UserRole = UserRole = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["ASSIGNED"] = "assigned";
    JobStatus["DISPATCHED"] = "dispatched";
    JobStatus["IN_PROGRESS"] = "in_progress";
    JobStatus["ON_SITE"] = "on_site";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["FAILED"] = "failed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var WorkerStatus;
(function (WorkerStatus) {
    WorkerStatus["AVAILABLE"] = "available";
    WorkerStatus["BUSY"] = "busy";
    WorkerStatus["OFFLINE"] = "offline";
    WorkerStatus["ON_BREAK"] = "on_break";
})(WorkerStatus || (exports.WorkerStatus = WorkerStatus = {}));
var GeofenceType;
(function (GeofenceType) {
    GeofenceType["CIRCLE"] = "circle";
    GeofenceType["POLYGON"] = "polygon";
})(GeofenceType || (exports.GeofenceType = GeofenceType = {}));
var CheckInEventType;
(function (CheckInEventType) {
    CheckInEventType["CHECK_IN"] = "check_in";
    CheckInEventType["CHECK_OUT"] = "check_out";
})(CheckInEventType || (exports.CheckInEventType = CheckInEventType = {}));
//# sourceMappingURL=index.js.map