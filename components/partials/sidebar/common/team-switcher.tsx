"use client"

import * as React from "react"
import { ChevronsUpDown, Check, CirclePlus } from 'lucide-react';
import { useClientSession } from "@/providers/client-session.provider";

import { cn } from "@/lib/utils"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useConfig } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { motion } from "framer-motion";
import { useMenuHoverConfig } from "@/hooks/use-menu-hover";
import { useParams, useRouter } from "next/navigation";
import type { SwitcherItem } from "@/lib/switcher-types";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface TeamSwitcherProps extends PopoverTriggerProps { }

export default function TeamSwitcher({ className }: TeamSwitcherProps) {
    const [config] = useConfig();
    const [hoverConfig] = useMenuHoverConfig();
    const { hovered } = hoverConfig;
    const clientSession = useClientSession();
    const session = clientSession;
    const [open, setOpen] = React.useState(false)
    const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false)
    const [items, setItems] = React.useState<SwitcherItem[]>([]);
    const params = useParams();
    const router = useRouter();
    const currentId = params?.id as string;

    React.useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 5000);

        fetch("/api/switcher-items", {
            signal: controller.signal,
            cache: "no-store",
        })
            .then((res) => res.json().catch(() => null))
            .then((data) => {
                if (Array.isArray(data?.items)) {
                    setItems(data.items);
                }
            })
            .catch(() => null)
            .finally(() => window.clearTimeout(timer));

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, []);

    const selectedItem = React.useMemo(() => {
        return items.find(item => item.id === currentId) || items[0];
    }, [items, currentId]);

    if (config.showSwitcher === false || config.sidebar === 'compact') return null

    const handleSelect = (item: SwitcherItem) => {
        setOpen(false);
        const locale = params?.locale || "en";
        router.push(`/${locale}/analytics/${item.id}/page`);
    };

    return (
        <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
            <Popover open={open} onOpenChange={setOpen}>

                <PopoverTrigger asChild>

                    <motion.div
                        key={(config.collapsed && !hovered) ? "collapsed" : "expanded"}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        {(config.collapsed && !hovered) ? <Button
                            variant="outline"
                            color="secondary"
                            role="combobox"
                            fullWidth
                            aria-expanded={open}
                            aria-label="Select a team"
                            className={cn("  h-14 w-14 mx-auto  p-0 md:p-0  dark:border-secondary ring-offset-sidebar", className)}
                        >
                            <Avatar className="">
                                <AvatarImage
                                    height={24}
                                    width={24}
                                    src={selectedItem?.image as any || session?.user?.image as any}
                                    alt={selectedItem?.name || "Team"}
                                    className="grayscale"
                                />

                                <AvatarFallback>{selectedItem?.name?.charAt(0) || session?.user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Button> : <Button
                            variant="outline"
                            color="secondary"
                            role="combobox"
                            fullWidth
                            aria-expanded={open}
                            aria-label="Select a team"
                            className={cn("  h-auto py-3 md:px-3 px-3 justify-start dark:border-secondary ring-offset-sidebar", className)}
                        >
                            <div className=" flex  gap-2 flex-1 items-center">
                                <Avatar className=" flex-none h-[38px] w-[38px]">
                                    <AvatarImage
                                        height={38}
                                        width={38}
                                        src={selectedItem?.image as any || session?.user?.image as any}
                                        alt={selectedItem?.name || "Team"}
                                        className="grayscale"
                                    />

                                    <AvatarFallback>{selectedItem?.name?.charAt(0) || session?.user?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-start w-[100px]">

                                    <div className=" text-sm  font-semibold text-default-900 truncate">{selectedItem?.name || "Switch Account"}</div>
                                    <div className=" text-xs font-normal text-default-500 dark:text-default-700 truncate capitalize ">{selectedItem?.role || "Role"}</div>

                                </div>
                                <div className="">
                                    <ChevronsUpDown className="ml-auto h-5 w-5 shrink-0  text-default-500 dark:text-default-700" />
                                </div>
                            </div>
                        </Button>}
                    </motion.div>

                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0">
                    <Command>
                        <CommandList>
                            <CommandInput placeholder="Search account..." className=" placeholder:text-xs" />
                            <CommandEmpty>No account found.</CommandEmpty>
                            <CommandGroup heading={session?.user?.role === "client" ? "Team Users" : "Clients"}>
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        onSelect={() => handleSelect(item)}
                                        className="text-sm font-normal py-2"
                                    >
                                        <Avatar className="h-6 w-6 mr-2">
                                            <AvatarImage src={item.image as any} />
                                            <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[120px]">{item.name}</span>
                                            <span className="text-[10px] text-default-500">{item.role}</span>
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                selectedItem?.id === item.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create team</DialogTitle>
                    <DialogDescription>
                        Add a new team to manage products and customers.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <div className="space-y-4 py-2 pb-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Team name</Label>
                            <Input id="name" placeholder="Acme Inc." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plan">Subscription plan</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">
                                        <span className="font-medium">Free</span> -{" "}
                                        <span className="text-muted-foreground">
                                            Trial for two weeks
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="pro">
                                        <span className="font-medium">Pro</span> -{" "}
                                        <span className="text-muted-foreground">
                                            $9/month per user
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewTeamDialog(false)}>
                        Cancel
                    </Button>
                    <Button type="submit">Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
