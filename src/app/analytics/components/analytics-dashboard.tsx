"use client";

import {
  BarChart3,
  Box,
  FolderTree,
  ImageOff,
  Phone,
  ReceiptText,
  RefreshCcw,
  Search,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AnalyticsComercioItem = {
  id: string;
  name: string;
  slug: string;
  ativo: boolean;
  plano: string;
};

type AnalyticsPayload = {
  comercios: AnalyticsComercioItem[];
  selectedComercioId: string | null;
  analytics: {
    comercio: {
      id: string;
      name: string;
      slug: string;
      phone: string;
      address: string;
      avatarImageUrl: string;
      coverImageUrl: string;
    };
    totals: {
      products: number;
      categories: number;
      orders: number;
    };
    orders: Array<{
      id: number;
      customerName: string;
      customerCellPhone: string;
      status: string;
      total: number;
      createdAt: string;
      itemCount: number;
    }>;
  } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    IN_PREPARANTION: "Em preparação",
    FINISHED: "Finalizado",
    CANCELLED: "Cancelado",
  };

  return labels[status] ?? status;
}

function statusClasses(status: string) {
  const classes: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    IN_PREPARANTION: "bg-sky-100 text-sky-800",
    FINISHED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-rose-100 text-rose-800",
  };

  return classes[status] ?? "bg-slate-100 text-slate-700";
}

function normalizeImageSrc(src: string | null | undefined, fallbackSrc: string) {
  const trimmed = src?.trim();

  if (!trimmed) {
    return fallbackSrc;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.startsWith("public/")) {
    return `/${trimmed.slice("public/".length)}`;
  }

  return `/${trimmed}`;
}

function AnalyticsImage({
  src,
  alt,
  heightClass,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  heightClass: string;
  fallbackSrc: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(() => normalizeImageSrc(src, fallbackSrc));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(normalizeImageSrc(src, fallbackSrc));
    setHasError(false);
  }, [fallbackSrc, src]);

  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#86efac] bg-[#f0fdf4] text-[#166534] ${heightClass}`}>
        <ImageOff className="h-7 w-7" />
        <p className="text-sm font-medium">Imagem indisponível</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] ${heightClass}`}>
      <img src={currentSrc} alt={alt} className="h-full w-full object-cover" loading="lazy" onError={handleError} />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [selectedComercioId, setSelectedComercioId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);

  const loadAnalytics = useCallback(async (comercioId?: string, initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setReloading(true);
    }

    try {
      const params = new URLSearchParams();
      if (comercioId) {
        params.set("comercioId", comercioId);
      }

      const response = await fetch(`/api/analytics${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar o analytics");
      }

      const nextPayload = (await response.json()) as AnalyticsPayload;
      setPayload(nextPayload);
      setSelectedComercioId(nextPayload.selectedComercioId ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar analytics");
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(undefined, true);
  }, [loadAnalytics]);

  const analytics = payload?.analytics ?? null;

  const filteredComercios = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return payload?.comercios ?? [];
    }

    return (payload?.comercios ?? []).filter((comercio) =>
      comercio.name.toLowerCase().includes(normalizedQuery)
    );
  }, [payload?.comercios, searchQuery]);

  const selectedComercio = useMemo(
    () => (payload?.comercios ?? []).find((comercio) => comercio.id === selectedComercioId) ?? null,
    [payload?.comercios, selectedComercioId]
  );

  const cards = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      {
        label: "Produtos cadastrados",
        value: analytics.totals.products,
        icon: Box,
      },
      {
        label: "Categorias",
        value: analytics.totals.categories,
        icon: FolderTree,
      },
      {
        label: "Pedidos criados",
        value: analytics.totals.orders,
        icon: ReceiptText,
      },
    ];
  }, [analytics]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f0fdf4_0%,#dcfce7_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="border-[#bbf7d0] bg-white/90 shadow-[0_14px_42px_rgba(22,163,74,0.12)] backdrop-blur">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#3b2f2f]">
                <BarChart3 className="h-5 w-5" />
                Analytics de Estabelecimentos
              </CardTitle>
              <p className="mt-1 text-sm text-[#6a5c52]">
                Visualize dados principais do estabelecimento, volume cadastral e pedidos criados.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => void loadAnalytics(selectedComercioId || undefined)}
                disabled={loading || reloading}
              >
                <RefreshCcw className="h-4 w-4" /> Recarregar
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
          <CardHeader>
            <CardTitle className="text-base text-[#3b2f2f]">Selecionar estabelecimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Buscar por nome</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f7a67]" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Digite o nome do estabelecimento"
                    className="border-[#86efac] bg-[#f0fdf4] pl-10"
                    disabled={loading || reloading || !payload?.comercios.length}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#bbf7d0] bg-[#f8fffa] p-2">
                  {filteredComercios.length ? (
                    <div className="space-y-2">
                      {filteredComercios.map((comercio) => {
                        const isSelected = comercio.id === selectedComercioId;

                        return (
                          <button
                            key={comercio.id}
                            type="button"
                            className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                              isSelected
                                ? "border-[#166534] bg-[#dcfce7] text-[#14532d]"
                                : "border-[#d7f5df] bg-white text-[#166534] hover:bg-[#f0fdf4]"
                            }`}
                            onClick={() => {
                              if (comercio.id === selectedComercioId) {
                                return;
                              }

                              setSelectedComercioId(comercio.id);
                              void loadAnalytics(comercio.id);
                            }}
                            disabled={loading || reloading}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold">{comercio.name}</p>
                                <p className="text-xs opacity-80">/{comercio.slug}</p>
                              </div>
                              <div className="text-right text-xs">
                                <p>{comercio.plano}</p>
                                <p>{comercio.ativo ? "Ativo" : "Inativo"}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-center text-sm text-[#166534]">
                      Nenhum estabelecimento encontrado para a busca informada.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Selecionado</p>
                {selectedComercio ? (
                  <div className="mt-3 space-y-2 text-[#166534]">
                    <p className="text-lg font-semibold text-[#14532d]">{selectedComercio.name}</p>
                    <p className="text-sm">Slug: /{selectedComercio.slug}</p>
                    <p className="text-sm">Plano: {selectedComercio.plano}</p>
                    <p className="text-sm">Status: {selectedComercio.ativo ? "Ativo" : "Inativo"}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#166534]">Selecione um estabelecimento para visualizar.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
            <CardContent className="py-10 text-center text-[#166534]">Carregando analytics...</CardContent>
          </Card>
        ) : !analytics ? (
          <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
            <CardContent className="py-10 text-center text-[#166534]">
              Nenhum estabelecimento encontrado para exibir.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
                <CardHeader>
                  <CardTitle className="text-base text-[#3b2f2f]">Visão do estabelecimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <AnalyticsImage
                    src={analytics.comercio.coverImageUrl}
                    alt={`Capa de ${analytics.comercio.name}`}
                    heightClass="h-52"
                    fallbackSrc="/default-cover.svg"
                  />

                  <div className="grid gap-5 md:grid-cols-[140px_1fr]">
                    <AnalyticsImage
                      src={analytics.comercio.avatarImageUrl}
                      alt={`Foto de ${analytics.comercio.name}`}
                      heightClass="h-36 w-full md:w-36"
                      fallbackSrc="/default-avatar.svg"
                    />

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Nome</p>
                        <p className="text-2xl font-semibold text-[#14532d]">{analytics.comercio.name}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[#dcfce7] bg-[#f0fdf4] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Telefone</p>
                          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#166534]">
                            <Phone className="h-4 w-4" />
                            {analytics.comercio.phone || "Não informado"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#dcfce7] bg-[#f0fdf4] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Slug</p>
                          <p className="mt-1 text-sm font-medium text-[#166534]">{analytics.comercio.slug}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#dcfce7] bg-[#f8fffa] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">Endereço</p>
                        <p className="mt-1 text-sm leading-6 text-[#166534]">
                          {analytics.comercio.address || "Não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.label} className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#166534]">
                          <Icon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#8f7a67]">{card.label}</p>
                          <p className="mt-1 text-3xl font-bold text-[#14532d]">{card.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Card className="border-[#bbf7d0] bg-gradient-to-br from-[#14532d] to-[#22c55e] text-white shadow-[0_12px_28px_rgba(22,163,74,0.20)]">
                  <CardContent className="p-6">
                    <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                      <Store className="h-4 w-4" />
                      Estabelecimento analisado
                    </p>
                    <p className="mt-3 text-2xl font-semibold">{analytics.comercio.name}</p>
                    <p className="mt-1 text-sm text-white/80">Visualização somente leitura para auditoria operacional.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-[#bbf7d0] bg-white/95 shadow-[0_10px_26px_rgba(22,163,74,0.10)]">
              <CardHeader>
                <CardTitle className="text-base text-[#3b2f2f]">Pedidos criados</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.orders.length ? (
                  <div className="overflow-x-auto rounded-xl border border-[#bbf7d0]">
                    <table className="min-w-full divide-y divide-[#dcfce7] text-sm">
                      <thead className="bg-[#ecfdf5]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Pedido</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Cliente</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Telefone</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Itens</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Total</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#166534]">Criado em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dcfce7] bg-white">
                        {analytics.orders.map((order) => (
                          <tr key={order.id} className="hover:bg-[#f8fff9]">
                            <td className="px-3 py-2 font-semibold text-[#14532d]">#{order.id}</td>
                            <td className="px-3 py-2 text-[#166534]">{order.customerName}</td>
                            <td className="px-3 py-2 text-[#166534]">{order.customerCellPhone}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(order.status)}`}>
                                {statusLabel(order.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#166534]">{order.itemCount}</td>
                            <td className="px-3 py-2 text-[#166534]">{formatCurrency(order.total)}</td>
                            <td className="px-3 py-2 text-[#166534]">{formatDate(order.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#bbf7d0] bg-[#f8fffa] px-4 py-10 text-center text-[#166534]">
                    Nenhum pedido criado para este estabelecimento.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}