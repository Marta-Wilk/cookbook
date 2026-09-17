import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipePicker from './RecipePicker'
import { Recipe } from '../api/client'

function makeRecipe(id: number, name: string, slug: string): Recipe {
  return { id, name, slug, content: '', tags: '', servings: 2, prepTimeMinutes: 10 }
}

const RECIPES: Recipe[] = [
  makeRecipe(1, 'Tomato Soup', 'tomato-soup'),
  makeRecipe(2, 'Chicken Curry', 'chicken-curry'),
  makeRecipe(3, 'Caesar Salad', 'caesar-salad'),
  makeRecipe(4, 'Beef Stew', 'beef-stew'),
  makeRecipe(5, 'Pasta Carbonara', 'pasta-carbonara'),
  makeRecipe(6, 'Greek Salad', 'greek-salad'),
]

describe('RecipePicker — initial render', () => {
  it('hides the recipe list on initial render when no value is provided', () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('hides the recipe list on initial render even when a value is provided', () => {
    render(<RecipePicker recipes={RECIPES} value="tomato-soup" onChange={() => {}} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('pre-fills the input with the selected recipe name when a value slug is provided', () => {
    render(<RecipePicker recipes={RECIPES} value="chicken-curry" onChange={() => {}} />)
    expect(screen.getByLabelText('Filter recipes')).toHaveValue('Chicken Curry')
  })

  it('leaves the input empty when no value is provided', () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Filter recipes')).toHaveValue('')
  })
})

describe('RecipePicker — list open/close', () => {
  it('shows the recipe list when the user types in the input', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 's')
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('hides the recipe list after a recipe is selected', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 'beef')
    await userEvent.click(screen.getByRole('button', { name: 'Beef Stew' }))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('fills the input with the selected recipe name after selection', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 'beef')
    await userEvent.click(screen.getByRole('button', { name: 'Beef Stew' }))
    expect(screen.getByLabelText('Filter recipes')).toHaveValue('Beef Stew')
  })
})

describe('RecipePicker — filtering', () => {
  it('shows all recipes when list is open and input is empty', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    const input = screen.getByLabelText('Filter recipes')
    await userEvent.type(input, 'a')
    await userEvent.clear(input)
    RECIPES.forEach(r => {
      expect(screen.getByRole('button', { name: r.name })).toBeInTheDocument()
    })
  })

  it('filters recipes by name substring (case-insensitive)', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 'sala')
    expect(screen.getByRole('button', { name: 'Caesar Salad' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Greek Salad' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tomato Soup' })).not.toBeInTheDocument()
  })

  it('filter match is case-insensitive', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 'CHICKEN')
    expect(screen.getByRole('button', { name: 'Chicken Curry' })).toBeInTheDocument()
  })

  it('shows "No recipes match" when filter matches nothing', async () => {
    render(<RecipePicker recipes={RECIPES} value="" onChange={() => {}} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 'zzz')
    expect(screen.getByText('No recipes match')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('RecipePicker — empty library', () => {
  it('shows "No recipes available" when recipes array is empty', () => {
    render(<RecipePicker recipes={[]} value="" onChange={() => {}} />)
    expect(screen.getByText('No recipes available')).toBeInTheDocument()
  })
})

describe('RecipePicker — selection', () => {
  it('calls onChange with the correct slug when an item is clicked', async () => {
    const onChange = vi.fn()
    render(<RecipePicker recipes={RECIPES} value="" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Filter recipes'), 'stew')
    await userEvent.click(screen.getByRole('button', { name: 'Beef Stew' }))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('beef-stew')
  })

  it('highlights the currently selected recipe in the list', async () => {
    render(<RecipePicker recipes={RECIPES} value="chicken-curry" onChange={() => {}} />)
    const input = screen.getByLabelText('Filter recipes')
    await userEvent.clear(input)
    await userEvent.type(input, 'c')
    expect(screen.getByRole('button', { name: 'Chicken Curry' }))
      .toHaveClass('recipe-picker__item--selected')
    expect(screen.getByRole('button', { name: 'Caesar Salad' }))
      .not.toHaveClass('recipe-picker__item--selected')
  })
})
