/** Báo nghỉ trước giờ học ít hơn bấy nhiêu giờ thì bị tính là báo trễ (LeaveRequestService của backend) */
export const LATE_NOTICE_HOURS = 24;

/** Phòng học trực tuyến mở trước giờ học bấy nhiêu phút (MeetingServiceImpl.JOIN_OPENS_BEFORE_START của backend) */
export const JOIN_OPENS_BEFORE_MINUTES = 15;

/** Phòng học còn vào lại được bấy nhiêu phút sau giờ kết thúc (MeetingServiceImpl.JOIN_CLOSES_AFTER_END) */
export const JOIN_CLOSES_AFTER_MINUTES = 15;
