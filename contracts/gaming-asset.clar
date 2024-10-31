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

;; Create a new game asset
(define-public (create-asset
  (game-id (string-ascii 50))
  (name (string-ascii 100))
  (description (string-ascii 500))
  (royalty-rate uint)
  (initial-price uint)
)
  (begin
    ;; Validate royalty rate (max 20%)
    (asserts! (< royalty-rate u20) ERR-INVALID-ROYALTY-RATE)

    ;; Increment asset ID
    (let ((asset-id (var-get next-asset-id)))
      (var-set next-asset-id (+ asset-id u1))

      ;; Store asset details
      (map-set assets
        {asset-id: asset-id, game-id: game-id}
        {
          owner: tx-sender,
          creator: tx-sender,
          name: name,
          description: description,
          royalty-rate: royalty-rate,
          price: initial-price
        }
      )

      (ok asset-id)
    )
  )
)

;; Transfer asset ownership
(define-public (transfer-asset
  (asset-id uint)
  (game-id (string-ascii 50))
  (new-owner principal)
  (new-price uint)
)
  (let
    (
      (asset (unwrap!
        (map-get? assets {asset-id: asset-id, game-id: game-id})
        ERR-ASSET-NOT-FOUND
      ))
    )
    ;; Ensure only current owner can transfer
    (asserts! (is-eq tx-sender (get owner asset)) ERR-NOT-OWNER)

    ;; Calculate royalty for creator
    (let
      (
        (royalty-amount (/ (* (get royalty-rate asset) new-price) u100))
        (seller-amount (- new-price royalty-amount))
      )
      ;; Transfer royalty to creator
      (try! (stx-transfer? royalty-amount tx-sender (get creator asset)))

      ;; Update asset ownership and price
      (map-set assets
        {asset-id: asset-id, game-id: game-id}
        (merge asset {
          owner: new-owner,
          price: new-price
        })
      )

      (ok true)
    )
  )
)

;; Get asset details
(define-read-only (get-asset-details
  (asset-id uint)
  (game-id (string-ascii 50))
)
  (map-get? assets {asset-id: asset-id, game-id: game-id})
)

;; List asset for sale
(define-public (list-asset-for-sale
  (asset-id uint)
  (game-id (string-ascii 50))
  (new-price uint)
)
  (let
    (
      (asset (unwrap!
        (map-get? assets {asset-id: asset-id, game-id: game-id})
        ERR-ASSET-NOT-FOUND
      ))
    )
    ;; Ensure only owner can list
    (asserts! (is-eq tx-sender (get owner asset)) ERR-NOT-OWNER)

    ;; Update price
    (map-set assets
      {asset-id: asset-id, game-id: game-id}
      (merge asset {price: new-price})
    )

    (ok true)
  )
)

;; Purchase asset
(define-public (purchase-asset
  (asset-id uint)
  (game-id (string-ascii 50))
)
  (let
    (
      (asset (unwrap!
        (map-get? assets {asset-id: asset-id, game-id: game-id})
        ERR-ASSET-NOT-FOUND
      ))
      (current-price (get price asset))
    )
    ;; Check buyer has sufficient funds
    (asserts! (>= (stx-get-balance tx-sender) current-price) ERR-INSUFFICIENT-FUNDS)

    ;; Transfer payment to current owner
    (try! (stx-transfer? current-price tx-sender (get owner asset)))

    ;; Transfer asset ownership
    (map-set assets
      {asset-id: asset-id, game-id: game-id}
      (merge asset {owner: tx-sender})
    )

    (ok true)
  )
)
