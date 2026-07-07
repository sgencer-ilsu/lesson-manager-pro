export type Student = {
  id: number;
  user_id: string;
  name: string;
  school: string;
  subject: string;
  parent_name: string;
  phone: string;
  email: string;
  fee: number;
  color: string;
  active: boolean;
  notes: string;
  created_at: string;
};

export type Planned = {
  id: number;
  user_id: string;
  student_id: number;
  lesson_date: string; // YYYY-MM-DD
  lesson_time: string; // HH:MM
  fee: number;
  note: string;
  recurring: boolean;
  weekday: number | null;
  recurrence_end: string | null;
  parent_plan_id: number | null;
  materialized_lesson_id: number | null;
  status: "planned" | "done";
};

export type Lesson = {
  id: number;
  user_id: string;
  student_id: number;
  lesson_date: string;
  lesson_time: string;
  duration_min: number;
  topic: string;
  fee: number;
  paid: boolean;
  notes: string;
  planned_id: number | null;
};

// Bir haftalık takvimde gösterilen birleşik olay tipi (planned + lesson).
export type CalendarEvent = {
  row_type: "planned" | "lesson";
  row_id: number;
  plan_id: number | null;
  lesson_id: number | null;
  student_id: number;
  lesson_date: string;
  lesson_time: string;
  fee: number;
  topic: string;
  status: "planned" | "done";
  recurring: boolean;
  parent_plan_id: number | null;
  student_name: string;
  subject: string;
  school: string;
  color: string;
};
