"""add communication_tickets table

Revision ID: 9a4cefe3b2c1
Revises: b10727d556a3
Create Date: 2026-03-26 11:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a4cefe3b2c1'
down_revision = 'b10727d556a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'communication_tickets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('message', sa.String(length=2000), nullable=False),
        sa.Column('doctor_response', sa.String(length=2000), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('communication_tickets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_communication_tickets_doctor_id'), ['doctor_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_communication_tickets_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_communication_tickets_status'), ['status'], unique=False)


def downgrade():
    with op.batch_alter_table('communication_tickets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_communication_tickets_status'))
        batch_op.drop_index(batch_op.f('ix_communication_tickets_patient_id'))
        batch_op.drop_index(batch_op.f('ix_communication_tickets_doctor_id'))

    op.drop_table('communication_tickets')

