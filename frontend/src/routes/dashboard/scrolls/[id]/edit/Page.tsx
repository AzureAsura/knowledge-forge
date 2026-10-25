import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useMe } from "@/features/auth/queries";
import ScrollForm from "@/components/scrolls/ScrollForm";
import { canEditScroll } from "@/features/scrolls/permissions";
import { scrollQueries } from "@/features/scrolls/queries";
import { ApiError } from "@/lib/api/errors";

export default function EditScrollPage() {
  const { id = "" } = useParams();
  const me = useMe();
  const { data: scroll } = useSuspenseQuery(scrollQueries.detail(id));
  if (!canEditScroll(me, scroll)) throw new ApiError(403, "You can only edit your own drafts.");

  return <ScrollForm key={scroll.id} scroll={scroll} />;
}
