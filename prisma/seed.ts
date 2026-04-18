import { PrismaClient } from "@prisma/client";
import snapshotData from "./seed-data.snapshot.json" with { type: "json" };

const prisma = new PrismaClient();

type Snapshot = {
  generatedAt: string;
  counts: Record<string, number>;
  comercios: any[];
};

const snapshot = snapshotData as Snapshot;

const toDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value);
};

async function upsertComercio(comercio: any) {
  await prisma.comercio.upsert({
    where: { id: comercio.id },
    update: {
      name: comercio.name,
      slug: comercio.slug,
      address: comercio.address ?? comercio.addres ?? comercio.endereco ?? "",
      description: comercio.description,
      avatarImageUrl: comercio.avatarImageUrl,
      coverImageUrl: comercio.coverImageUrl,
      phone: comercio.phone,
      ativo: comercio.ativo,
      plano: comercio.plano,
    },
    create: {
      id: comercio.id,
      name: comercio.name,
      slug: comercio.slug,
      address: comercio.address ?? comercio.addres ?? comercio.endereco ?? "",
      description: comercio.description,
      avatarImageUrl: comercio.avatarImageUrl,
      coverImageUrl: comercio.coverImageUrl,
      phone: comercio.phone,
      ativo: comercio.ativo,
      plano: comercio.plano,
      createdAt: toDate(comercio.createdAt) ?? undefined,
      updateAt: toDate(comercio.updateAt) ?? undefined,
    },
  });
}

async function upsertUsers(comercio: any) {
  for (const user of comercio.users ?? []) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        password: user.password,
        name: user.name,
        comercioId: user.comercioId,
        emailVerified: user.emailVerified,
        verificationToken: user.verificationToken,
        verificationTokenExpiry: toDate(user.verificationTokenExpiry),
        resetToken: user.resetToken,
        resetTokenExpiry: toDate(user.resetTokenExpiry),
      },
      create: {
        id: user.id,
        email: user.email,
        password: user.password,
        name: user.name,
        comercioId: user.comercioId,
        emailVerified: user.emailVerified,
        verificationToken: user.verificationToken,
        verificationTokenExpiry: toDate(user.verificationTokenExpiry),
        resetToken: user.resetToken,
        resetTokenExpiry: toDate(user.resetTokenExpiry),
        createdAt: toDate(user.createdAt) ?? undefined,
        updatedAt: toDate(user.updatedAt) ?? undefined,
      },
    });
  }
}

async function upsertCategoriesAndProducts(comercio: any) {
  for (const category of comercio.menuCategory ?? []) {
    await prisma.menuCategory.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        order: category.order,
        comercioId: category.comercioId,
      },
      create: {
        id: category.id,
        name: category.name,
        order: category.order,
        comercioId: category.comercioId,
        createdAt: toDate(category.createdAt) ?? undefined,
        updateAt: toDate(category.updateAt) ?? undefined,
      },
    });

    for (const product of category.product ?? []) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          comercioId: product.comercioId,
          menuCategoryId: product.menuCategoryId,
        },
        create: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          comercioId: product.comercioId,
          menuCategoryId: product.menuCategoryId,
          createdAt: toDate(product.createdAt) ?? undefined,
          updateAt: toDate(product.updateAt) ?? undefined,
        },
      });
    }
  }
}



async function upsertOrders(comercio: any) {
  for (const order of comercio.order ?? []) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {
        total: order.total,
        status: order.status,
        comercioId: order.comercioId,
        customerName: order.customerName,
        customerCellPhone: order.customerCellPhone,
      },
      create: {
        id: order.id,
        total: order.total,
        status: order.status,
        comercioId: order.comercioId,
        customerName: order.customerName,
        customerCellPhone: order.customerCellPhone,
        createdAt: toDate(order.createdAt) ?? undefined,
        updateAt: toDate(order.updateAt) ?? undefined,
      },
    });

    for (const item of order.orderProducts ?? []) {
      await prisma.orderProduct.upsert({
        where: { id: item.id },
        update: {
          productId: item.productId,
          orderId: item.orderId,
          quantity: item.quantity,
          price: item.price,
        },
        create: {
          id: item.id,
          productId: item.productId,
          orderId: item.orderId,
          quantity: item.quantity,
          price: item.price,
          createdAt: toDate(item.createdAt) ?? undefined,
          updateAt: toDate(item.updateAt) ?? undefined,
        },
      });
    }
  }
}

async function main() {
  console.log("🌱 Seed baseado em snapshot do banco");
  console.log(`📦 Snapshot gerado em: ${snapshot.generatedAt}`);
  console.log("ℹ️ Este seed não apaga dados existentes. Ele faz upsert por ID.");

  for (const comercio of snapshot.comercios) {
    await upsertComercio(comercio);
    await upsertUsers(comercio);
    await upsertCategoriesAndProducts(comercio);
    await upsertOrders(comercio);
    console.log(`✅ Sincronizado: ${comercio.name}`);
  }

  console.log("\n📊 Contagens do snapshot:");
  for (const [key, value] of Object.entries(snapshot.counts)) {
    console.log(`- ${key}: ${value}`);
  }

  console.log("✅ Seed finalizado");
}

main()
  .catch((error) => {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
