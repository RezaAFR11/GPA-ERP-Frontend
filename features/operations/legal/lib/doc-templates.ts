import type { DocType } from "@/lib/types";

/**
 * Pre-filled HTML templates for each document type.
 * Loaded into the TipTap editor when the user selects a doc type.
 * Placeholders are wrapped in brackets: [placeholder]
 */
export const DOC_TEMPLATES: Record<DocType, string> = {

  // ── Surat Penawaran ───────────────────────────────────────────────────────
  proposal: `
<p>Dengan hormat,</p>
<p>Menindaklanjuti <strong>[referensi pertemuan / surat permintaan]</strong>, bersama ini kami mengajukan penawaran harga untuk pekerjaan <strong>[nama pekerjaan]</strong> pada <strong>[nama proyek / lokasi]</strong>.</p>
<p>Adapun lingkup pekerjaan yang kami tawarkan adalah sebagai berikut:</p>
<ol>
  <li>[item pekerjaan 1]</li>
  <li>[item pekerjaan 2]</li>
  <li>[item pekerjaan 3]</li>
</ol>
<h3>Ketentuan Penawaran</h3>
<ul>
  <li>Masa berlaku penawaran : 30 (tiga puluh) hari kalender</li>
  <li>Termin pembayaran      : [termin pembayaran]</li>
  <li>Waktu pelaksanaan      : [durasi pekerjaan]</li>
  <li>Garansi pekerjaan      : [masa garansi]</li>
</ul>
<p>Demikian penawaran ini kami sampaikan. Atas perhatian dan kepercayaan Bapak/Ibu, kami mengucapkan terima kasih.</p>
`.trim(),

  // ── Berita Acara ──────────────────────────────────────────────────────────
  berita_acara: `
<p>Pada hari ini, <strong>[hari]</strong>, tanggal <strong>[tanggal]</strong>, bertempat di <strong>[lokasi]</strong>, telah dilaksanakan serah terima pekerjaan dengan keterangan sebagai berikut:</p>
<p><strong>Nama Pekerjaan     :</strong> [nama pekerjaan]</p>
<p><strong>Lokasi Pekerjaan   :</strong> [lokasi pekerjaan]</p>
<p><strong>Nilai Kontrak      :</strong> Rp [nilai kontrak]</p>
<p><strong>Tanggal Mulai      :</strong> [tanggal mulai]</p>
<p><strong>Tanggal Selesai    :</strong> [tanggal selesai]</p>
<p>Dengan ini menyatakan bahwa pekerjaan tersebut telah <strong>diselesaikan dengan baik</strong> dan sesuai dengan spesifikasi teknis yang telah disepakati bersama.</p>
<h3>Catatan</h3>
<ul>
  <li>[catatan 1 — kosongkan jika tidak ada]</li>
</ul>
<p>Demikian berita acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
`.trim(),

  // ── Surat Jalan ───────────────────────────────────────────────────────────
  surat_jalan: `
<p>Dengan hormat,</p>
<p>Bersama surat ini kami informasikan bahwa barang / material berikut telah dikirimkan:</p>
<p><strong>Tujuan Pengiriman  :</strong> [alamat tujuan]</p>
<p><strong>Tanggal Pengiriman :</strong> [tanggal]</p>
<p><strong>Kendaraan          :</strong> [jenis kendaraan — plat nomor]</p>
<p><strong>Pengemudi          :</strong> [nama pengemudi]</p>
<h3>Daftar Barang</h3>
<ol>
  <li>[nama barang] — [jumlah] [satuan]</li>
  <li>[nama barang] — [jumlah] [satuan]</li>
</ol>
<p>Harap dilakukan pemeriksaan barang pada saat penerimaan. Apabila terdapat ketidaksesuaian, mohon segera menghubungi kami dalam waktu 1 × 24 jam.</p>
`.trim(),

  // ── Surat Lainnya ─────────────────────────────────────────────────────────
  other: `
<p>Dengan hormat,</p>
<p>[tulis isi surat di sini]</p>
<p>Demikian surat ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.</p>
`.trim(),
};
