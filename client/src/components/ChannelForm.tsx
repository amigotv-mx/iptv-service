import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChannelSchema, type InsertChannel } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateChannel, useUpdateChannel } from "@/hooks/use-channels";
import { Loader2 } from "lucide-react";

interface ChannelFormProps {
  initialData?: InsertChannel & { id: number };
  onSuccess: () => void;
}

export function ChannelForm({ initialData, onSuccess }: ChannelFormProps) {
  const form = useForm<InsertChannel>({
    resolver: zodResolver(insertChannelSchema),
    defaultValues: initialData || {
      name: "",
      logoUrl: "",
    },
  });

  const createMutation = useCreateChannel();
  const updateMutation = useUpdateChannel();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: InsertChannel) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      form.reset();
      onSuccess();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Retro TV" {...field} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/logo.png" {...field} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          disabled={isPending} 
          className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialData ? "Update Channel" : "Create Channel"}
        </Button>
      </form>
    </Form>
  );
}
