import ProductsClient from "@/components/ProductsClient";
import ProductsServer from "@/components/ProductsServer";
import Image from "next/image";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { page, limit } = await searchParams;
  return process.env.NEXT_PUBLIC_IS_SSR === "true" ? (
    <ProductsServer page={Number(page ?? 1)} limit={Number(limit ?? 25)} />
  ) : (
    <ProductsClient page={Number(page ?? 1)} limit={Number(limit ?? 25)} />
  );
}
