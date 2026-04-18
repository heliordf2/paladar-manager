import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

function resolveComercioImageUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const baseUrl = process.env.URL_PROD?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  if (!baseUrl) {
    return trimmed;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${normalizedBase}${normalizedPath}`;
}

type AnalyticsOrderItem = {
  id: number;
  customerName: string;
  customerCellPhone: string;
  status: string;
  total: number;
  createdAt: string;
  itemCount: number;
};

export async function GET(request: NextRequest) {
  const thinkCookie = request.cookies.get(THINK_COOKIE_KEY)?.value;
  if (!isThinkCookieValid(thinkCookie)) {
    return NextResponse.json({ error: "Usuário não validado" }, { status: 401 });
  }

  const comercios = await db.comercio.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      ativo: true,
      plano: true,
    },
  });

  if (!comercios.length) {
    return NextResponse.json({
      comercios: [],
      selectedComercioId: null,
      analytics: null,
    });
  }

  const selectedComercioId = request.nextUrl.searchParams.get("comercioId")?.trim();
  const activeComercioId =
    comercios.find((comercio) => comercio.id === selectedComercioId)?.id ?? comercios[0].id;

  const comercio = await db.comercio.findUnique({
    where: { id: activeComercioId },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      avatarImageUrl: true,
      coverImageUrl: true,
      _count: {
        select: {
          product: true,
          menuCategory: true,
          order: true,
        },
      },
    },
  });

  if (!comercio) {
    return NextResponse.json({ error: "Comércio não encontrado" }, { status: 404 });
  }

  const orders = await db.order.findMany({
    where: { comercioId: activeComercioId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      customerCellPhone: true,
      status: true,
      total: true,
      createdAt: true,
      orderProducts: {
        select: {
          quantity: true,
        },
      },
    },
  });

  const serializedOrders: AnalyticsOrderItem[] = orders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    customerCellPhone: order.customerCellPhone,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    itemCount: order.orderProducts.reduce((sum, item) => sum + item.quantity, 0),
  }));

  return NextResponse.json({
    comercios,
    selectedComercioId: activeComercioId,
    analytics: {
      comercio: {
        id: comercio.id,
        name: comercio.name,
        slug: comercio.slug,
        phone: comercio.phone,
        address: comercio.address,
        avatarImageUrl: resolveComercioImageUrl(comercio.avatarImageUrl),
        coverImageUrl: resolveComercioImageUrl(comercio.coverImageUrl),
      },
      totals: {
        products: comercio._count.product,
        categories: comercio._count.menuCategory,
        orders: comercio._count.order,
      },
      orders: serializedOrders,
    },
  });
}