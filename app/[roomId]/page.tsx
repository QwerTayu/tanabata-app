"use client";

import { useParams } from "next/navigation";
import { RoomView } from "@/components/RoomView";

export default function ParticipantPage() {
  const { roomId } = useParams<{ roomId: string }>();
  return <RoomView roomId={roomId} isAdmin={false} />;
}
