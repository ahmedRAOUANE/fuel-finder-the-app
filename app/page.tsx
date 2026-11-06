import { notFound } from "next/navigation";
import { getCurrentUser } from "@/access/context";
import { AppError } from "@/errors/base.error";
import {
  listFuelCatalogsForFilterService,
  listServiceCatalogsForFilterService,
  searchStationsService,
} from "@/services/station.services";
import { SearchShell } from "@/components/search/search-shell";

export default async function HomePage() {
  const user = await getCurrentUser();
  const userSafe =
    user instanceof AppError
      ? null
      : { publicId: user.publicId, firstName: user.firstName };

  const [initialResults, fuelCatalogs, serviceCatalogs] = await Promise.all([
    searchStationsService({}),
    listFuelCatalogsForFilterService(),
    listServiceCatalogsForFilterService(),
  ]);

  if (
    initialResults instanceof AppError ||
    fuelCatalogs instanceof AppError ||
    serviceCatalogs instanceof AppError
  ) {
    notFound();
  }

  return (
    <SearchShell
      initialResults={initialResults}
      fuelCatalogs={fuelCatalogs}
      serviceCatalogs={serviceCatalogs}
      user={userSafe}
    />
  );
}