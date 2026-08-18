from pydantic import BaseModel, Field


class FragmentReconstructionInput(BaseModel):
    fragmentId: int = Field(
        ge=1,
        le=4,
    )

    content: str = Field(
        min_length=1,
    )

    password: str = Field(
        min_length=1,
    )


class ReconstructCARequest(BaseModel):
    fragments: list[FragmentReconstructionInput] = Field(
        min_length=3,
        max_length=4,
    )