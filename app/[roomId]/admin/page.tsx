"use client";

import { useParams } from "next/navigation";
import { RoomView } from "@/components/RoomView";

export default function AdminPage() {
  const { roomId } = useParams<{ roomId: string }>();
  return <RoomView roomId={roomId} isAdmin={true} />;
}
