'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Product } from '@/utils/supabase/types'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (productData: Partial<Product>) => Promise<void>
  product?: Product | null
}

export default function ProductForm({ isOpen, onClose, onSubmit, product }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    active: true
  })
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. FONCTION DE COMPRESSION ULTIME
  const processAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Limite max de 800px pour minimiser le poids
          const MAX_SIZE = 800
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          // Fond blanc (utile si l'image source est un PNG transparent)
          if (ctx) {
            ctx.fillStyle = "#FFFFFF"
            ctx.fillRect(0, 0, width, height)
            ctx.drawImage(img, 0, 0, width, height)
          }

          // Conversion en JPEG (le format le plus léger pour le web)
          // Qualité 0.5 (50%) : excellent compromis poids/visibilité
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5)
          resolve(compressedBase64)
        }
        img.onerror = () => reject("Erreur lors du traitement de l'image")
      }
      reader.onerror = () => reject("Erreur de lecture du fichier")
    })
  }

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price?.toString() || '',
        description: product.description || '',
        active: product.active !== false
      })
      setPreviewUrl(product.image_data || '')
    } else {
      resetForm()
    }
  }, [product, isOpen])

  const resetForm = () => {
    setFormData({ name: '', price: '', description: '', active: true })
    setPreviewUrl('')
    setImageFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setImageFile(file)

    // Afficher un aperçu immédiat (non compressé juste pour l'oeil)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Dans ProductForm.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const productData: any = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      description: formData.description.trim() || null,
      active: formData.active
    }

    // On compresse et on assigne à la colonne 'image' (nom exact en BDD)
    if (imageFile) {
      productData.image = await processAndCompressImage(imageFile)
    } else if (previewUrl) {
      productData.image = previewUrl
    }

    await onSubmit(productData)
    onClose()
    resetForm()
  } catch (err: any) {
    setError("Erreur : " + err.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? '✏️ Modifier le produit' : '➕ Nouveau produit'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nom du produit"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Prix (DA)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
            placeholder="Description courte..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Image du produit</label>
          <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <div className="w-20 h-20 bg-white rounded-lg border overflow-hidden flex-shrink-0">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🖼️</div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-[10px] text-blue-600 mt-2 font-bold uppercase tracking-wider">⚡ Compression automatique activée</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
          <input
            type="checkbox"
            id="active-status"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="active-status" className="text-sm font-medium text-gray-700 cursor-pointer">
            Produit disponible à la vente
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            ❌ {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="flex-[2]">
            {loading ? 'Optimisation...' : 'Enregistrer le produit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
