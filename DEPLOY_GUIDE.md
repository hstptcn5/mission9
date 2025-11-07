# 🚀 Hướng Dẫn Deploy Chog Art Gallery Quest

## Bước 1: Test Build Frontend ✅

Đã sửa lỗi build! Bây giờ test lại:

```bash
npm run build
```

Nếu build thành công, bạn sẽ thấy thư mục `dist/` được tạo.

## Bước 2: Deploy NFT Contract

### 2.1. Setup Contract Environment

```bash
cd contracts
npm install
```

### 2.2. Tạo file .env

```bash
cp .env.example .env
```

Chỉnh sửa `.env`:
```
MONAD_RPC_URL=https://monad-testnet-rpc.monad.xyz
PRIVATE_KEY=your_private_key_here
```

**Lưu ý**: 
- Cần testnet tokens từ Monad faucet
- **KHÔNG** commit file `.env` lên GitHub!

### 2.3. Compile Contract

```bash
npm run compile
```

### 2.4. Deploy Contract

```bash
npm run deploy:testnet
```

Sau khi deploy thành công, bạn sẽ nhận được:
- **Contract Address**: `0x...` (lưu lại!)
- **Transaction Hash**: `0x...`
- **Verification Status**: ✅ (nếu verify thành công)

### 2.5. Update Frontend với Contract Address

Sau khi deploy contract, cập nhật `src/utils/nftMinting.js`:

```javascript
const NFT_CONTRACT_ADDRESS = '0x...' // Thay bằng address vừa deploy
```

## Bước 3: Deploy Frontend

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Hoặc connect GitHub repo với Vercel để auto-deploy.

### Option 2: Netlify

```bash
# Build first
npm run build

# Deploy dist/ folder to Netlify
# Hoặc dùng Netlify CLI
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

## Bước 4: Test End-to-End

1. ✅ Connect wallet (MetaMask với Monad testnet)
2. ✅ Browse gallery
3. ✅ Vote cho dApps
4. ✅ Collect dApps (mint NFT)
5. ✅ Unlock glitch reveal (sau 3 votes)
6. ✅ Xem hidden gems

## Checklist Trước Khi Submit

- [ ] Frontend build thành công
- [ ] Contract deployed trên Monad testnet
- [ ] Contract address đã update trong frontend
- [ ] Frontend deployed (Vercel/Netlify)
- [ ] Test tất cả features
- [ ] README.md đã cập nhật
- [ ] GitHub repo public
- [ ] Demo video/GIF (optional nhưng recommended)

## Troubleshooting

### Build Error
- Đảm bảo đã đổi `questStore.js` → `questStore.jsx`
- Xóa `node_modules` và `npm install` lại

### Contract Deploy Error
- Kiểm tra có đủ testnet tokens
- Verify RPC URL đúng
- Check private key format

### NFT Minting Error
- Verify contract address đúng
- Check wallet connected
- Verify contract ABI matches

## Next Steps

Sau khi deploy xong:
1. Tạo demo GIF/video
2. Tweet với #MonadMission9 tag @ChogNFT
3. Submit form Tally.so với:
   - GitHub link
   - Demo URL
   - Tweet thread

---

**Good luck! 🎨 Chog is ready to paint! 🐕**

