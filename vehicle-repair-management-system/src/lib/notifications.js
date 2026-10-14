import { toast } from "@/components/ui/toast";

export function showToast(type, title, description) {
  toast.add({ type, title, description });
}
