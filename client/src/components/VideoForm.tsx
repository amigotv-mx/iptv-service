import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVideoSchema, type InsertVideo } from "@shared/schema";
import { z } from "zod";
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
import { useCreateVideo, useUpdateVideo } from "@/hooks/use-videos";
import { Loader2 } from "lucide-react";

interface VideoFormProps {
  channelId: number;
  initialData?: InsertVideo & { id: number };
  onSuccess: () => void;
}

export function VideoForm({ channelId, initialData, onSuccess }: VideoFormProps) {
  // Extending schema to coerce string order inputs to number
  const schema = insertVideoSchema.extend({
    order: z.coerce.number().int().default(0),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      channelId,
      title: "",
      url: "",
      order: 0,
    },
  });

  const createMutation = useCreateVideo();
  const updateMutation = useUpdateVideo();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, ...data });
      } else {
        await createMutation.mutateAsync({ ...data, channelId });
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 80s Commercials Vol 1" {...field} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL</FormLabel>
              <FormControl>
                <Input placeholder="YouTube, Dailymotion, or MP4 URL" {...field} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Playback Order</FormLabel>
              <FormControl>
                <Input type="number" {...field} className="bg-background/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          disabled={isPending}
          className="w-full bg-gradient-to-r from-accent to-accent/80 hover:shadow-lg hover:shadow-accent/25 transition-all"
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialData ? "Update Video" : "Add Video"}
        </Button>
      </form>
    </Form>
  );
}
