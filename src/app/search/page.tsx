import { SearchResultsView } from "@/components/search/search-results-view";
import { searchCrm } from "@/server/services/search";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function getQueryValue(query: string | string[] | undefined) {
  if (Array.isArray(query)) {
    return query[0] ?? "";
  }

  return query ?? "";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const results = await searchCrm(getQueryValue(params.q));

  return <SearchResultsView results={results} />;
}
