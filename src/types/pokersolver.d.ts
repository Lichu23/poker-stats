declare module 'pokersolver' {
  export class Hand {
    name: string
    rank: number
    static solve(cards: string[], game?: string): Hand
    static winners(hands: Hand[]): Hand[]
  }
}
