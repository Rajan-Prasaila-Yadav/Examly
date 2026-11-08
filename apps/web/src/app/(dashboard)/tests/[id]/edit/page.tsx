'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditTestRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/tests/create?testId=${id}`);
    }
  }, [id, router]);

  return (
    <div className="py-16 text-center text-xs text-slate-500">
      Loading test editor wizard…
    </div>
  );
}

