import EventForm from "@/components/EventForm";
import { createEvent } from "../actions";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">交流会を新規作成</h1>
      <EventForm action={createEvent} />
    </div>
  );
}
