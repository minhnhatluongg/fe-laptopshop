interface Props {
  title: string;
  description?: string;
}

export default function AdminPlaceholder({ title, description }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-white/[0.03]">
      <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
        {description ?? "Trang này đang được phát triển. API đã sẵn sàng — UI sẽ được build tiếp."}
      </p>
    </div>
  );
}
