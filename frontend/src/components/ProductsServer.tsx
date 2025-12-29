import ProductsTable from "./ProductTable";

type Props = {
  page: number;
  limit: number;
};

export default async function ProductsServer({ page, limit }: Props) {
  const start = performance.now();
  const res = await fetch(
    `http://localhost:5001/api/products?page=${page}&limit=${limit}`,
    {
      cache:
        process.env.NEXT_PUBLIC_IS_CACHE === "true"
          ? "force-cache"
          : "no-store",
      next: { tags: ["products"] },
    }
  );

  const data = await res.json();
  const end = performance.now();
  console.log("[SSR] fetch + render time:", end - start);

  return <ProductsTable initialData={data?.data} page={page} limit={limit} />;
}
