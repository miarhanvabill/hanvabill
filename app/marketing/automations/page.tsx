"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  MarketingAutomation,
} from "@/app/actions/automations";
import { toast } from "sonner";
import {
  Gift,
  HeartHandshake,
  Star,
  Settings2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_AUTOMATIONS = [
  {
    name: "Birthday Greeting",
    trigger_type: "birthday",
    channel: "whatsapp",
    message_template:
      "Hi {customer_name}, wishing you a very Happy Birthday! Enjoy 15% off your next visit with code BDAY15.",
    icon: Gift,
    color: "text-pink-500",
    bg: "bg-pink-100",
  },
  {
    name: "Win-back 90 Days",
    trigger_type: "winback",
    channel: "whatsapp",
    message_template:
      "Hi {customer_name}, we miss you! It's been a while. Book your next appointment now and get 10% off.",
    icon: HeartHandshake,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    name: "Post-appointment Review",
    trigger_type: "post_appointment",
    channel: "whatsapp",
    message_template:
      "Hi {customer_name}, thanks for visiting us today! How was your experience? Reply with 1-5 to rate us.",
    icon: Star,
    color: "text-yellow-500",
    bg: "bg-yellow-100",
  },
];

export default function MarketingAutomationsPage() {
  const [automations, setAutomations] = useState<MarketingAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAutomation, setEditingAutomation] =
    useState<MarketingAutomation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    channel: "",
    message_template: "",
  });

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const response = await getAutomations();
      if (response.success && response.data) {
        setAutomations(response.data);
      } else {
        toast.error("Failed to load automations");
      }
    } catch (error) {
      toast.error("Error loading automations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (
    defAutomation: (typeof DEFAULT_AUTOMATIONS)[0],
    currentData?: MarketingAutomation,
  ) => {
    try {
      if (currentData) {
        // Toggle existing
        const newStatus = !currentData.is_active;

        // Optimistic UI update
        setAutomations((prev) =>
          prev.map((a) =>
            a.id === currentData.id ? { ...a, is_active: newStatus } : a,
          ),
        );

        const res = await updateAutomation(currentData.id, {
          is_active: newStatus,
        });
        if (!res.success) {
          toast.error("Failed to update status");
          // Revert on fail
          fetchAutomations();
        } else {
          toast.success(
            newStatus ? "Automation enabled" : "Automation disabled",
          );
        }
      } else {
        // Create new
        const newAutomation = {
          name: defAutomation.name,
          trigger_type: defAutomation.trigger_type,
          channel: defAutomation.channel,
          message_template: defAutomation.message_template,
          is_active: true,
        };

        const res = await createAutomation(newAutomation);
        if (res.success && res.data) {
          setAutomations((prev) => [res.data, ...prev]);
          toast.success("Automation enabled");
        } else {
          toast.error("Failed to enable automation");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
      fetchAutomations();
    }
  };

  const openEditDialog = (
    defAutomation: (typeof DEFAULT_AUTOMATIONS)[0],
    currentData?: MarketingAutomation,
  ) => {
    if (currentData) {
      setEditingAutomation(currentData);
      setEditForm({
        name: currentData.name,
        channel: currentData.channel,
        message_template: currentData.message_template,
      });
    } else {
      // It hasn't been created yet, but we want to customize before enabling or just create it customized.
      const tempId = "temp_" + defAutomation.trigger_type;
      setEditingAutomation({
        id: tempId,
        name: defAutomation.name,
        trigger_type: defAutomation.trigger_type,
        channel: defAutomation.channel,
        message_template: defAutomation.message_template,
        is_active: false,
      });
      setEditForm({
        name: defAutomation.name,
        channel: defAutomation.channel,
        message_template: defAutomation.message_template,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAutomation) return;

    setIsSaving(true);
    try {
      if (editingAutomation.id.startsWith("temp_")) {
        // Create it
        const newAutomation = {
          name: editForm.name,
          trigger_type: editingAutomation.trigger_type,
          channel: editForm.channel,
          message_template: editForm.message_template,
          is_active: true,
        };
        const res = await createAutomation(newAutomation);
        if (res.success && res.data) {
          setAutomations((prev) => [res.data, ...prev]);
          toast.success("Automation customized and enabled");
          setIsDialogOpen(false);
        } else {
          toast.error("Failed to save automation");
        }
      } else {
        // Update it
        const res = await updateAutomation(editingAutomation.id, {
          name: editForm.name,
          channel: editForm.channel,
          message_template: editForm.message_template,
        });
        if (res.success) {
          setAutomations((prev) =>
            prev.map((a) =>
              a.id === editingAutomation.id
                ? {
                    ...a,
                    name: editForm.name,
                    channel: editForm.channel,
                    message_template: editForm.message_template,
                  }
                : a,
            ),
          );
          toast.success("Automation updated");
          setIsDialogOpen(false);
        } else {
          toast.error("Failed to update automation");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/marketing">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <PageHeader
              title="Automated Marketing Flows"
              description="Set up automatic messages to engage your customers at the right time."
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="grid gap-6">
              {DEFAULT_AUTOMATIONS.map((def, idx) => {
                const currentData = automations.find(
                  (a) => a.trigger_type === def.trigger_type,
                );
                const isActive = currentData?.is_active || false;
                const Icon = def.icon;

                return (
                  <Card
                    key={idx}
                    className={`overflow-hidden transition-all duration-200 \${isActive ? 'border-purple-200 shadow-md' : 'border-gray-200'}`}
                  >
                    <div
                      className={`absolute top-0 left-0 w-1 h-full \${isActive ? 'bg-purple-600' : 'bg-transparent'}`}
                    />
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center \${def.bg}`}
                          >
                            <Icon className={`w-6 h-6 \${def.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                              {currentData?.name || def.name}
                              {isActive && (
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-100 text-purple-700 hover:bg-purple-100"
                                >
                                  Active
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Triggers when:{" "}
                              <span className="font-medium text-gray-700 capitalize">
                                {def.trigger_type.replace("_", " ")}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`toggle-\${def.trigger_type}`}
                            className="text-sm text-gray-500 cursor-pointer"
                          >
                            {isActive ? "Enabled" : "Disabled"}
                          </Label>
                          <Switch
                            id={`toggle-\${def.trigger_type}`}
                            checked={isActive}
                            onCheckedChange={() =>
                              handleToggle(def, currentData)
                            }
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4 border text-sm text-gray-600 font-medium">
                        <div className="flex justify-between items-center mb-2">
                          <span className="uppercase text-xs font-bold text-gray-500 tracking-wider flex items-center gap-1">
                            Message Preview{" "}
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0"
                            >
                              {currentData?.channel || def.channel}
                            </Badge>
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">
                          {currentData?.message_template ||
                            def.message_template}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(def, currentData)}
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Customize Settings
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Customize Automation</DialogTitle>
            <DialogDescription>
              Edit the settings and message template for this automated flow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Automation Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Birthday Greeting"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={editForm.channel}
                onValueChange={(v) =>
                  setEditForm((prev) => ({ ...prev, channel: v }))
                }
              >
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message Template</Label>
              </div>
              <Textarea
                id="message"
                className="min-h-[120px]"
                value={editForm.message_template}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    message_template: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-gray-500">
                Available variables:{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-purple-600">{`{customer_name}`}</code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
