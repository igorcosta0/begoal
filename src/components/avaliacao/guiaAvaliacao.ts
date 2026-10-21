import type { TourPasso } from '@/store/useTourStore'

// Guia interativo da Avaliação (pedido 21/10/2026): mesmo tour do Guia de Uso
// (TourOverlay), só com passos da tela de Avaliação, explicando as metas
// individuais. Os passos mudam com o papel de quem abriu: a gestão do ciclo
// (administrador/calibrador), o líder que cadastra metas e todo mundo que se
// autoavalia. Os alvos são atributos data-tour da página de Avaliação.

const PAGINA = '/avaliacao'

interface Papel {
  /** Visão de gestão do ciclo (administrador ou calibrador). */
  gestao: boolean
  /** Administrador de verdade da empresa (pode corrigir meta depois da ativação). */
  administrador: boolean
  /** Tem liderados no organograma (cadastra as metas deles). */
  lider: boolean
}

export function passosGuiaAvaliacao({ gestao, administrador, lider }: Papel): TourPasso[] {
  const passos: TourPasso[] = [
    {
      id: 'av-intro',
      pagina: PAGINA,
      alvo: null,
      titulo: 'Guia da Avaliação',
      texto: 'A avaliação tem duas partes de peso igual. A Cultura são os 4 pilares, iguais para todo mundo. O Desempenho mudou: agora cada pessoa tem as próprias metas, combinadas com o líder no começo do ciclo.',
    },
  ]

  if (gestao) {
    passos.push(
      {
        id: 'av-ciclos',
        pagina: PAGINA,
        alvo: 'tour-av-ciclos',
        titulo: 'Os ciclos',
        texto: 'Cada ciclo é um semestre. Ao criar um ciclo novo, a opção "Desempenho por metas individuais" já vem marcada. Os ciclos antigos continuam como eram, com os critérios da vertical.',
        posicao: 'top',
      },
      {
        id: 'av-aba-metas',
        pagina: PAGINA,
        alvo: 'tour-av-aba-metas',
        titulo: 'A aba Metas',
        texto: administrador
          ? 'Abra um ciclo com metas individuais e clique em "Metas": você vê as metas de todo mundo e quem ainda está sem nenhuma. Como administrador, você também corrige uma meta depois que o ciclo foi ativado.'
          : 'Abra um ciclo com metas individuais e clique em "Metas" para ver as metas de todo mundo e quem ainda está sem nenhuma.',
        posicao: 'bottom',
      }
    )
  }

  if (lider) {
    passos.push({
      id: 'av-metas-lideres',
      pagina: PAGINA,
      alvo: gestao ? 'tour-av-aba-metas' : 'tour-av-metas-lideres',
      titulo: 'As metas dos seus liderados',
      texto: 'Enquanto o ciclo está em rascunho, você cadastra de 1 a 5 metas para cada pessoa que responde a você: o que precisa ser entregue e como vai ser medido. Clique no nome da pessoa para abrir e adicionar.',
      posicao: 'top',
    })
  }

  if (gestao || lider) {
    passos.push({
      id: 'av-trava',
      pagina: PAGINA,
      alvo: null,
      titulo: 'Quando as metas travam',
      texto: 'Quando o ciclo é ativado, as metas travam e ninguém mais muda, a não ser o administrador, para corrigir um erro. O ciclo só pode ser ativado quando todo avaliado tiver pelo menos uma meta.',
    })
  }

  passos.push(
    {
      id: 'av-minhas',
      pagina: PAGINA,
      alvo: 'tour-av-minhas',
      titulo: 'A sua autoavaliação',
      texto: 'Ao abrir a sua avaliação, a aba "Metas Individuais (50%)" mostra as metas que o seu líder definiu. Dê uma nota de 1 a 5 em cada uma, com a mesma régua de sempre, e conte exemplos do que você entregou.',
      posicao: 'bottom',
    },
    {
      id: 'av-gestor',
      pagina: PAGINA,
      alvo: null,
      titulo: 'Gestor e calibragem',
      texto: 'Depois, o gestor dá a nota dele nas mesmas metas, e a calibragem fecha o resultado. Como sempre, cada pessoa só vê a nota que ela mesma deu.',
    },
    {
      id: 'av-pares',
      pagina: PAGINA,
      alvo: 'tour-av-devo',
      titulo: 'Avaliação de Pares',
      texto: 'Nos ciclos com metas individuais, a Avaliação de Pares fica só com a Cultura: o colega não dá nota nas metas de outra pessoa.',
      posicao: 'top',
    },
    {
      id: 'av-fim',
      pagina: PAGINA,
      alvo: null,
      titulo: 'Pronto!',
      texto: 'Você pode rever este guia quando quiser, pelo botão "Guia da Avaliação" no topo desta tela.',
    }
  )

  // Alvo que não está na tela (ex.: ninguém para avaliar em pares) não trava o
  // guia: o TourOverlay mostra o pop-up centralizado enquanto procura.
  return passos
}
