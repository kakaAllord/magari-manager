import { FeedbackInbox } from "@/components/feedback-inbox";
import { pageFrom } from "@/components/pager";
import { requireFeedbackReader } from "@/lib/feedback";

export default async function FeedbackPage({ searchParams }: PageProps<"/director/maoni">) {
  const reader = await requireFeedbackReader();
  return <FeedbackInbox reader={reader} page={pageFrom(await searchParams)} />;
}
