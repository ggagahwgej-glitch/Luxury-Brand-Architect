import type { Metadata } from "next";
import { PropertyForm } from "@/components/admin/property-form";

export const metadata: Metadata = { title: "Add Property" };

export default function NewPropertyPage() {
  return <PropertyForm />;
}
