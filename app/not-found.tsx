import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="mt-2"><Link href="/" className="text-primary underline">Certidrill</Link></p>
    </main>
  );
}
