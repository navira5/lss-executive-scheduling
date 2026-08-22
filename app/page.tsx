import type { Metadata } from "next";
import { CalendarPlanner } from "./CalendarPlanner";

export const metadata: Metadata = {
  title: "LSS 2027 Calendar Planning Workbench",
  description:
    "A rules-first working draft for Lutheran Social Services of Central Ohio's 2027 governance and organizational calendar.",
};

export default function Home() {
  return <CalendarPlanner />;
}
