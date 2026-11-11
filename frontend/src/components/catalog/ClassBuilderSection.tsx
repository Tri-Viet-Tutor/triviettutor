import { useState } from "react";
import { ClassSlip } from "@/components/catalog/ClassSlip";
import { CourseOutline } from "@/components/catalog/CourseOutline";
import { OptionGroup } from "@/components/catalog/OptionGroup";
import { OptionSelect } from "@/components/catalog/OptionSelect";
import { Reveal } from "@/components/motion";
import { CONTAINER } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS, TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import { COURSES } from "@/constants/courses";
import type { ClassOption } from "@/interfaces/course";
import type { ClassBuilderSectionProps } from "@/interfaces/catalog";

// Môn học lấy từ danh sách khóa (thêm khóa là ô chọn tự có thêm môn); `value` là mã môn gửi cho backend
const SUBJECT_OPTIONS: ClassOption<string>[] = COURSES.map((course) => ({
  value: course.subject,
  label: course.subjectLabel,
  hint: `Khóa ${course.name}`,
  icon: course.icon,
}));

// Tìm lựa chọn theo giá trị; không thấy thì lấy lựa chọn đầu tiên
function find<T extends string>(options: ClassOption<T>[], value: T): ClassOption<T> {
  return options.find((option) => option.value === value) ?? options[0];
}

// Phiếu chọn lớp: năm mục ứng với năm thuộc tính của một lớp trong backend
// (khối lớp, môn, hình thức, lịch tuần, ca học). Bên phải là phiếu tóm tắt.
// Khi backend có GET /catalog/classes, năm giá trị này (cùng classType = GROUP) là bộ lọc gửi đi.
export function ClassBuilderSection({ subject, onSubjectChange }: ClassBuilderSectionProps) {
  // Bốn lựa chọn còn lại do phiếu tự giữ; mặc định ca tối (SLOT_EVENING)
  const [gradeLevel, setGradeLevel] = useState(GRADE_OPTIONS[0].value);
  const [deliveryMode, setDeliveryMode] = useState(DELIVERY_MODE_OPTIONS[0].value);
  const [schedulePattern, setSchedulePattern] = useState(SCHEDULE_PATTERN_OPTIONS[0].value);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOT_OPTIONS[2].value);

  const course = COURSES.find((item) => item.subject === subject) ?? COURSES[0];

  return (
    <section id="class-builder" className="scroll-mt-[120px] bg-[#F5F1E9] py-14 lg:py-20">
      <div className={`${CONTAINER} grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14`}>
        <Reveal className="space-y-9 lg:col-span-7">
          <OptionGroup
            step={1}
            legend="Khối lớp"
            name="gradeLevel"
            options={GRADE_OPTIONS}
            value={gradeLevel}
            onChange={setGradeLevel}
            columns="grid-cols-1 sm:grid-cols-3"
          />
          <OptionSelect step={2} legend="Môn học" name="subject" options={SUBJECT_OPTIONS} value={subject} onChange={onSubjectChange} />
          <OptionGroup
            step={3}
            legend="Hình thức học"
            name="deliveryMode"
            options={DELIVERY_MODE_OPTIONS}
            value={deliveryMode}
            onChange={setDeliveryMode}
            columns="grid-cols-2"
          />
          <OptionGroup
            step={4}
            legend="Lịch học trong tuần"
            name="schedulePattern"
            options={SCHEDULE_PATTERN_OPTIONS}
            value={schedulePattern}
            onChange={setSchedulePattern}
            columns="grid-cols-1 sm:grid-cols-3"
          />
          <OptionGroup
            step={5}
            legend="Ca học"
            name="timeSlot"
            options={TIME_SLOT_OPTIONS}
            value={timeSlot}
            onChange={setTimeSlot}
            columns="grid-cols-2 sm:grid-cols-4"
          />
          <CourseOutline course={course} />
        </Reveal>

        <Reveal delay={120} className="lg:sticky lg:top-[156px] lg:col-span-5">
          <ClassSlip
            course={course}
            grade={find(GRADE_OPTIONS, gradeLevel)}
            deliveryMode={find(DELIVERY_MODE_OPTIONS, deliveryMode)}
            schedulePattern={find(SCHEDULE_PATTERN_OPTIONS, schedulePattern)}
            timeSlot={find(TIME_SLOT_OPTIONS, timeSlot)}
          />
        </Reveal>
      </div>
    </section>
  );
}
