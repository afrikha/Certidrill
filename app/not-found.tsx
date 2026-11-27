import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-32 text-center">
      <h1 className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent">404</h1>
      <p className="mt-6"><Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">Certidrill</Link></p>
    </main>
  );
}
