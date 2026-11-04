import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-[#DCE4DD] bg-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2 max-w-md">
          <p className="font-display text-lg font-bold text-[#13241B]">PlantifyPH</p>
          <p className="text-sm text-[#4D5F54] leading-relaxed">
            Helping Filipinos grow healthier indoor foliage, native tropical specimens, and balcony edibles across every season.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-[#4D5F54]">
          <Link href="/plants" className="hover:text-[#13241B] transition-colors">
            Plant Catalog
          </Link>
          <Link href="/articles" className="hover:text-[#13241B] transition-colors">
            Gardening Knowledge
          </Link>
          <Link href="/register" className="hover:text-[#13241B] transition-colors">
            Create Account
          </Link>
          <Link href="/login" className="hover:text-[#13241B] transition-colors">
            Sign In
          </Link>
        </div>
      </div>
      <div className="border-t border-[#EBF0EC]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5E7065]">
          <span>© 2026 PlantifyPH · Manila, Philippines</span>
          <span>Tailored for Tag-init, Habagat & Amihan growing conditions</span>
        </div>
      </div>
    </footer>
  );
}
