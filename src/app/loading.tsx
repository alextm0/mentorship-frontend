export default function Loading() {

  // Stack uses React Suspense, which will render this page while user data is being fetched.
  // See: https://nextjs.org/docs/app/api-reference/file-conventions/loading
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" aria-hidden />
    </div>
  );
}
