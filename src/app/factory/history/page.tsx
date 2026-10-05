import { redirect } from "next/navigation";

// The factory manager no longer has a Historia page; old links and bookmarks land on Idhini.
export default function FactoryHistoryPage() {
  redirect("/factory/requests");
}
