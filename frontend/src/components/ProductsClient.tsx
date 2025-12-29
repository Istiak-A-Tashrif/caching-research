"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import ProductsTable from "./ProductTable";

type Props = {
  page: number;
  limit: number;
};

function ProductsPage({ page, limit }: Props) {
  const { data } = useQuery({
    queryKey: ["products", page, limit],
    queryFn: async () => {
      const start = performance.now();
      const res = await fetch(
        `http://localhost:5001/api/products?page=${page}&limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();

      const end = performance.now();
      console.log("[CSR] API fetch time:", end - start);

      return json;
    },
    staleTime: process.env.NEXT_PUBLIC_IS_CACHE === "true" ? 3600 * 1000 : 0, // 1 hour
    gcTime: process.env.NEXT_PUBLIC_IS_CACHE === "true" ? 3600 * 1000 : 0, // 1 hour
  });

  return <ProductsTable initialData={data?.data} page={page} limit={limit} />;
}

export default function ProductsClient({ page, limit }: Props) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ProductsPage page={page} limit={limit} />
    </QueryClientProvider>
  );
}
