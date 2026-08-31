
'use server';

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getPendingUsersCount() {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return 0

    const count = await prisma.user.count({
      where: {
        escolaId: session.user.escolaId,
        isApproved: false
      }
    })
    return count
  } catch (error) {
    console.error("Erro ao contar usuários pendentes:", error)
    return 0
  }
}
