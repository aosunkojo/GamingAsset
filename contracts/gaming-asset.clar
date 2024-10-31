;; Gaming Marketplace Smart Contract

;; Defines a data map for tracking game assets
(define-map assets
  {
    asset-id: uint,
    game-id: (string-ascii 50)
  }
  {
    owner: principal,
    creator: principal,
    name: (string-ascii 100),
    description: (string-ascii 500),
    royalty-rate: uint,
    price: uint
  }
)

;; Tracks the total number of assets created
(define-data-var next-asset-id uint u0)

;; Error constants
(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-INSUFFICIENT-FUNDS (err u101))
(define-constant ERR-ASSET-NOT-FOUND (err u102))
(define-constant ERR-INVALID-ROYALTY-RATE (err u103))
