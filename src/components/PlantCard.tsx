import Link from "next/link";
import type { Plant } from "@/lib/types/plant";
import { getCareStatus } from "@/lib/care/schedule";
import { CareStatusBadge } from "./CareStatusBadge";

export function PlantCard({ plant, now = new Date() }: { plant: Plant; now?: Date }) {
  return (
    <Link
      href={`/plants/${plant.id}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URLs, no next/image remote-pattern config needed */}
      <img
        src={plant.primaryPhotoUrl}
        alt={plant.nickname}
        className="h-40 w-full rounded-md object-cover"
      />
      <h3 className="mt-3 font-semibold text-gray-900">{plant.nickname}</h3>
      {plant.speciesCommonName && (
        <p className="text-sm text-gray-500">{plant.speciesCommonName}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <CareStatusBadge
          label="Water"
          status={getCareStatus(plant.lastWateredAt, plant.wateringIntervalDays, now)}
        />
        <CareStatusBadge
          label="Fertilize"
          status={getCareStatus(plant.lastFertilizedAt, plant.fertilizingIntervalDays, now)}
        />
        <CareStatusBadge
          label="Mist"
          status={getCareStatus(plant.lastMistedAt, plant.mistingIntervalDays, now)}
        />
      </div>
    </Link>
  );
}
