type game = {
    gameId: number,
    title: string,
    genreId: number,
    creationDate: string,
    creatorId: number,
    creatorFirstName: string,
    creatorLastName: string,
    price: number,
    rating: number
    platformIds: number[]
}

type gameReturn = {
    games: game[],
    count: number
}

type gameFull = game & {
    description: string,
    numberOfOwners: number,
    numberOfWishlists: number
}

type genre = {
    genreId: number,
    name: string
}

type platform = {
    platformId: number,
    name: string
}

type review = {
    reviewerId: number,
    rating: number,
    review: string,
    reviewerFirstName: string,
    reviewerLastName: string,
    timestamp: string
}

type gameSearchQuery = {
    q?: string,
    creatorId?: number,
    reviewerId?: number,
    genreIds?: number[],
    platformIds?: number[],
    price?: number,
    sortBy?: string,
    startIndex: number,
    count?: number
    ownedByMe: boolean,
    wishlistedByMe: boolean,
    userId?: number
}