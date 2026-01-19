# Supabase Kayıt Sorunu - Debug Rehberi

## Sorun
Oyun bitince Supabase'e kayıt olmuyor ama test başarılı.

## Kontrol Listesi

### 1. Dev Server Yeniden Başlatıldı mı?
```bash
# Ctrl+C ile durdur, sonra:
npm run dev
```

**ÖNEMLİ:** `.env.local` değişiklikleri sadece server başlatıldığında yüklenir!

### 2. Tarayıcı Konsolunu Kontrol Et

Oyunu oyna ve bitir, sonra tarayıcı konsolunda (F12) şunları ara:

#### Beklenen Loglar:
```
✅ "Saving game to Supabase:" - Bu görünmeli
✅ "Game saved successfully:" - Bu görünmeli
```

#### Hata Logları:
```
❌ "Supabase insert error:" - Hata varsa gösterir
❌ "Failed to log to Supabase:" - Catch bloğu hatası
❌ "No user address found" - Cüzdan bağlı değil
```

### 3. Olası Durumlar

#### Durum A: "Saving game to Supabase:" logu YOK
**Sebep:** `settleGame` fonksiyonu çağrılmıyor veya Supabase kısmına ulaşmıyor.

**Çözüm:**
1. Simülasyon gerçekten bitiyor mu? Arena'da tek tip kalıyor mu?
2. Konsola `simulation.status` ve `simulation.winner` değerlerini yazdır
3. `useEffect` tetikleniyor mu kontrol et

#### Durum B: "Saving game to Supabase:" var ama "Game saved successfully:" YOK
**Sebep:** Supabase insert başarısız oluyor.

**Çözüm:**
1. "Supabase insert error:" logunu kontrol et
2. Hata mesajını oku (RLS policy, tablo yok, vb.)
3. Supabase dashboard'da tabloyu kontrol et

#### Durum C: "No user address found" görünüyor
**Sebep:** Cüzdan bağlı değil veya FCL user snapshot alınamıyor.

**Çözüm:**
1. Cüzdanın bağlı olduğundan emin ol
2. Sayfayı yenile ve tekrar dene

#### Durum D: Her şey başarılı görünüyor ama Supabase'de kayıt yok
**Sebep:** Farklı Supabase instance'ına bakıyor olabilirsin.

**Çözüm:**
1. Supabase dashboard URL'ini kontrol et: https://tgwwzppwoyfqidkgwrwa.supabase.co
2. Table Editor'da `games` tablosunu aç
3. Refresh yap

### 4. Manuel Test

Tarayıcı konsolunda şunu çalıştır:

```javascript
// Test Supabase connection from browser
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'https://tgwwzppwoyfqidkgwrwa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnd3d6cHB3b3lmcWlka2d3cndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTMzNzMsImV4cCI6MjA4NDM4OTM3M30.Vda8Qgf2HrdVGGCMlK4xqKJhMapcJsuXgCO1j28AhFs'
);

const { data, error } = await supabase.from('games').select('*').limit(5);
console.log('Games:', data, 'Error:', error);
```

### 5. Ekstra Debug Logu Ekle

`page.tsx` dosyasında `useEffect` içine log ekle:

```typescript
useEffect(() => {
  console.log('Simulation status:', simulation.status);
  console.log('Simulation winner:', simulation.winner);
  console.log('Show result:', showResult);
  
  const isComplete = simulation.status === 'completed' || simulation.status === 'timeout';
  if (isComplete && simulation.winner && !showResult) {
    console.log('🎯 Calling settleGame with winner:', simulation.winner);
    const settle = async () => {
      setLoadingType('settling-game');
      try {
        const result = await settleGame.settleGame(simulation.winner!);
        console.log('✅ Settlement result:', result);
        setShowResult(true);
      } catch (err) {
        console.error('❌ Settlement error:', err);
        setError(err instanceof Error ? err.message : 'Failed to settle game');
      } finally {
        setLoadingType(null);
      }
    };
    settle();
  }
}, [simulation.status, simulation.winner, settleGame, showResult]);
```

## Hızlı Test Adımları

1. ✅ Dev server'ı yeniden başlat
2. ✅ Tarayıcıyı aç (http://localhost:3000)
3. ✅ F12 ile konsolu aç
4. ✅ Cüzdanı bağla
5. ✅ Bir bahis yap (örn: 1 FLOW, Rock)
6. ✅ Simülasyonun bitmesini bekle
7. ✅ Konsoldaki logları kontrol et
8. ✅ Supabase dashboard'da `games` tablosunu kontrol et

## Sonuç

Hangi durumdasın? Konsol loglarını bana göster, böylece tam olarak neyin yanlış gittiğini anlayabiliriz.
