"use client";

import { useQuery } from "@tanstack/react-query";
import ProductsTable from "./ProductTable";

type Props = {
  page: number;
  limit: number;
};

export default function ProductsClient({ page, limit }: Props) {
  const { data } = useQuery({
    queryKey: ["products", page, limit],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:5001/api/products?page=${page}&limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    },
    staleTime: process.env.NEXT_PUBLIC_IS_CACHE === "true" ? 3600 * 1000 : 0, // 1 hour
    gcTime: process.env.NEXT_PUBLIC_IS_CACHE === "true" ? 3600 * 1000 : 0, // 1 hour
  });

  return <ProductsTable initialData={data?.data} page={page} limit={limit} />;
}
